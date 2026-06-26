use crate::archive::*;
use crate::dto::*;
use crate::error::{
    internal_sql_error,
    map_object_store_route_error, map_service_error, not_found_problem, problem, ProblemDetail,
};
use crate::ids::next_drive_id;
use crate::mappers::*;
use crate::node_repository::find_node;
use crate::object_store::{
    build_s3_object_store_for_provider, find_storage_provider_by_id,
    missing_signing_provider_error, require_active_storage_provider,
    unsupported_signing_provider_error,
};
use crate::state::AppState;
use crate::storage_keys::*;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_contract::drive::domain_events as drive_events;
use sdkwork_drive_storage_contract::{
    DriveObjectLocator, DriveObjectStore, PutObjectRequest,
};
use sdkwork_drive_workspace_service::domain::uploader::content_type_group_for;
use sdkwork_drive_workspace_service::infrastructure::sql::node_head_metadata::file_extension_from_name;
use sdkwork_drive_workspace_service::infrastructure::sql::NODE_API_SELECT_COLUMNS;
use sqlx::AnyPool;
use sqlx::Row;
use std::collections::{BTreeMap, BTreeSet};

use crate::route_change::record_change;
use crate::space_repository::ensure_git_repository_space_root_accepts_node_type;
use crate::upload_support::{
    insert_node_version_metadata, resolve_storage_target, NodeVersionAttribution,
    NodeVersionStorageMetadata,
};

pub(crate) fn folder_create_request_matches(
    existing: &DriveNodeResponse,
    payload: &CreateFolderRequest,
    node_name: &str,
) -> bool {
    existing.node_type == "folder"
        && existing.space_id == payload.space_id
        && existing.parent_node_id.as_deref() == payload.parent_node_id.as_deref()
        && existing.node_name == node_name
        && existing.lifecycle_status != "deleted"
}


pub(crate) async fn validate_archive_extraction_plan(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    root_parent_node_id: Option<&str>,
    files: &[ArchiveFileForExtract],
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let mut planned_folders = BTreeSet::<String>::new();
    let mut planned_files = BTreeSet::<String>::new();

    for file in files {
        if file.path.segments.is_empty() {
            return Err(unsafe_archive_path_problem());
        }

        let folder_segments = &file.path.segments[..file.path.segments.len().saturating_sub(1)];
        let file_name = file
            .path
            .segments
            .last()
            .ok_or_else(unsafe_archive_path_problem)?;
        let mut current_parent_id = root_parent_node_id.map(ToString::to_string);
        let mut parent_is_existing = true;
        let mut current_path = String::new();

        for segment in folder_segments {
            if current_path.is_empty() {
                current_path.push_str(segment);
            } else {
                current_path.push('/');
                current_path.push_str(segment);
            }

            if planned_files.contains(&current_path) {
                return Err(archive_extraction_target_conflict_problem());
            }
            if planned_folders.contains(&current_path) {
                parent_is_existing = false;
                current_parent_id = None;
                continue;
            }

            if parent_is_existing {
                if let Some(existing) = find_live_child_by_name(
                    pool,
                    tenant_id,
                    space_id,
                    current_parent_id.as_deref(),
                    segment,
                )
                .await?
                {
                    if existing.lifecycle_status != "active" || existing.node_type != "folder" {
                        return Err(archive_extraction_target_conflict_problem());
                    }
                    current_parent_id = Some(existing.id);
                    continue;
                }
            }

            planned_folders.insert(current_path.clone());
            parent_is_existing = false;
            current_parent_id = None;
        }

        let file_path = file.path.segments.join("/");
        if planned_folders.contains(&file_path) || !planned_files.insert(file_path) {
            return Err(archive_extraction_target_conflict_problem());
        }

        if parent_is_existing
            && find_live_child_by_name(
                pool,
                tenant_id,
                space_id,
                current_parent_id.as_deref(),
                file_name,
            )
            .await?
            .is_some()
        {
            return Err(archive_extraction_target_conflict_problem());
        }

        let effective_parent_node_id = if parent_is_existing {
            current_parent_id.as_deref()
        } else {
            Some("__planned_archive_folder__")
        };
        ensure_git_repository_space_root_accepts_node_type(
            pool,
            tenant_id,
            space_id,
            effective_parent_node_id,
            "file",
        )
        .await?;
    }

    Ok(())
}
pub(crate) fn archive_extraction_target_conflict_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::CONFLICT,
        "conflict",
        "archive extraction target conflicts with an existing node",
        "drive.conflict",
    )
}
pub(crate) async fn ensure_archive_parent_folders(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    root_parent_node_id: Option<&str>,
    folder_segments: &[String],
    operator_id: &str,
) -> Result<Option<String>, (StatusCode, Json<ProblemDetail>)> {
    let mut current_parent = root_parent_node_id.map(ToString::to_string);
    for segment in folder_segments {
        let existing = find_live_child_by_name(
            pool,
            tenant_id,
            space_id,
            current_parent.as_deref(),
            segment,
        )
        .await?;
        if let Some(existing) = existing {
            if existing.lifecycle_status != "active" || existing.node_type != "folder" {
                return Err(problem(
                    StatusCode::CONFLICT,
                    "conflict",
                    "archive extraction path conflicts with an existing file",
                    "drive.conflict",
                ));
            }
            current_parent = Some(existing.id);
            continue;
        }
        let folder_id = next_drive_id("node");
        sqlx::query(
            "INSERT INTO dr_drive_node (
                id, tenant_id, space_id, parent_node_id, shortcut_target_node_id,
                node_type, node_name, content_state, lifecycle_status, version,
                created_by, updated_by
             ) VALUES ($1, $2, $3, $4, NULL, 'folder', $5, 'empty', 'active', 1, $6, $6)",
        )
        .bind(&folder_id)
        .bind(tenant_id)
        .bind(space_id)
        .bind(current_parent.as_deref())
        .bind(segment)
        .bind(operator_id)
        .execute(pool)
        .await
        .map_err(internal_sql_error(
            "insert archive extraction folder failed",
        ))?;
        record_change(
            pool,
            tenant_id,
            space_id,
            Some(&folder_id),
            drive_events::archive::FOLDER_CREATED,
            operator_id,
        )
        .await?;
        current_parent = Some(folder_id);
    }
    Ok(current_parent)
}
pub(crate) async fn find_live_child_by_name(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    parent_node_id: Option<&str>,
    node_name: &str,
) -> Result<Option<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(&format!(
        "SELECT {NODE_API_SELECT_COLUMNS}
         FROM dr_drive_node
         WHERE tenant_id=$1
           AND space_id=$2
           AND node_name=$3
           AND lifecycle_status != 'deleted'
           AND ((parent_node_id IS NULL AND $4 IS NULL) OR parent_node_id=$4)
         ORDER BY id ASC
         LIMIT 1",
    ))
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_name)
    .bind(parent_node_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find archive extraction child failed"))?;
    Ok(row.as_ref().map(map_node_row))
}
pub(crate) async fn create_extracted_archive_file(
    state: &AppState,
    tenant_id: &str,
    space_id: &str,
    parent_node_id: Option<&str>,
    file: &ArchiveFileForExtract,
    operator_id: &str,
) -> Result<DriveNodeResponse, (StatusCode, Json<ProblemDetail>)> {
    let node_name = file
        .path
        .segments
        .last()
        .ok_or_else(unsafe_archive_path_problem)?
        .to_string();
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        tenant_id,
        space_id,
        parent_node_id,
        "file",
    )
    .await?;
    ensure_no_live_name_conflict(
        &state.pool,
        tenant_id,
        space_id,
        parent_node_id,
        &node_name,
        None,
    )
    .await?;
    let node_id = next_drive_id("node");
    let storage_object_id = next_drive_id("obj");
    let target = resolve_storage_target(
        &state.pool,
        tenant_id,
        space_id,
        None,
        &node_id,
        &storage_object_id,
        1,
    )
    .await?;
    let provider = find_storage_provider_by_id(&state.pool, &target.provider_id)
        .await
        .map_err(map_service_error)?
        .ok_or_else(|| map_service_error(missing_signing_provider_error(&target.bucket)))?;
    let provider =
        require_active_storage_provider(provider, &target.bucket).map_err(map_service_error)?;
    let object_store = build_s3_object_store_for_provider(&provider)
        .await
        .map_err(map_service_error)?
        .ok_or_else(|| map_service_error(unsupported_signing_provider_error(&target.bucket)))?;
    object_store
        .put_object(PutObjectRequest {
            locator: DriveObjectLocator {
                bucket: target.bucket.clone(),
                object_key: target.object_key.clone(),
            },
            content_type: Some(file.content_type.clone()),
            metadata: BTreeMap::from([
                ("sdkwork-drive-tenant-id".to_string(), tenant_id.to_string()),
                (
                    "sdkwork-drive-source".to_string(),
                    "archive-extract".to_string(),
                ),
                (
                    "sdkwork-drive-archive-path".to_string(),
                    file.path.path.clone(),
                ),
            ]),
            body: file.content.clone(),
            checksum_sha256_hex: Some(file.checksum_sha256_hex.clone()),
        })
        .await
        .map_err(map_object_store_route_error)?;
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, shortcut_target_node_id,
            node_type, node_name, content_state, file_extension,
            head_content_type, head_content_type_group, head_content_length,
            head_version_no, head_checksum_sha256_hex,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, NULL, 'file', $5, 'ready', $6, $7, $8, $9, 1, $10, 'active', 1, $11, $11)",
    )
    .bind(&node_id)
    .bind(tenant_id)
    .bind(space_id)
    .bind(parent_node_id)
    .bind(&node_name)
    .bind(file_extension_from_name(&node_name))
    .bind(&file.content_type)
    .bind(content_type_group_for(&file.content_type).to_string())
    .bind(file.content.len() as i64)
    .bind(&file.checksum_sha256_hex)
    .bind(operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error(
        "insert archive extraction file node failed",
    ))?;
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            scene, source, content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES ($1, $2, $3, 1, $4, $5, $6, 'archive_extract', 'archive_entry', $7, $8, $9, 'active', $10, $10)",
    )
    .bind(&storage_object_id)
    .bind(tenant_id)
    .bind(&node_id)
    .bind(&target.provider_id)
    .bind(&target.bucket)
    .bind(&target.object_key)
    .bind(&file.content_type)
    .bind(file.content.len() as i64)
    .bind(&file.checksum_sha256_hex)
    .bind(operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error(
        "insert archive extraction storage object failed",
    ))?;
    insert_node_version_metadata(
        &state.pool,
        NodeVersionStorageMetadata {
            tenant_id,
            space_id,
            node_id: &node_id,
            version_no: 1,
            storage_object_id: &storage_object_id,
            content_type: &file.content_type,
            content_length: file.content.len() as i64,
            checksum_sha256_hex: &file.checksum_sha256_hex,
        },
        NodeVersionAttribution {
            version_kind: "import",
            change_source: "import",
            change_summary: Some("Extracted archive entry into Drive file"),
            app_id: None,
            app_resource_type: None,
            app_resource_id: None,
            scene: Some("archive_extract"),
            source: Some("archive_entry"),
        },
        operator_id,
    )
    .await?;
    record_change(
        &state.pool,
        tenant_id,
        space_id,
        Some(&node_id),
        drive_events::archive::ENTRY_EXTRACTED,
        operator_id,
    )
    .await?;
    find_node(&state.pool, tenant_id, &node_id).await
}
pub(crate) async fn validate_target_parent(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    target_parent_node_id: Option<&str>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let Some(parent_id) = target_parent_node_id else {
        return Ok(());
    };
    let row = sqlx::query(
        "SELECT node_type
         FROM dr_drive_node
         WHERE tenant_id=$1 AND space_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(space_id)
    .bind(parent_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("validate target parent failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("target parent node not found"));
    };
    let node_type: String = row.get("node_type");
    if node_type != "folder" {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "targetParentNodeId must reference an active folder",
            "drive.validation.failed",
        ));
    }
    Ok(())
}
pub(crate) async fn ensure_target_parent_is_not_descendant(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    target_parent_node_id: Option<&str>,
    moving_node_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let Some(mut cursor) = target_parent_node_id.map(str::to_string) else {
        return Ok(());
    };
    let mut visited = BTreeSet::new();

    loop {
        if cursor == moving_node_id {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "targetParentNodeId cannot reference a descendant of the moved node",
                "drive.validation.failed",
            ));
        }
        if !visited.insert(cursor.clone()) {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "node hierarchy contains a cycle",
                "drive.conflict",
            ));
        }

        let parent: Option<String> = sqlx::query_scalar(
            "SELECT parent_node_id
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND space_id=$2
               AND id=$3
               AND lifecycle_status='active'",
        )
        .bind(tenant_id)
        .bind(space_id)
        .bind(&cursor)
        .fetch_optional(pool)
        .await
        .map_err(internal_sql_error("validate target parent ancestry failed"))?
        .flatten();

        let Some(parent) = parent else {
            return Ok(());
        };
        cursor = parent;
    }
}
pub(crate) fn validate_create_file_idempotent_replay(
    payload: &CreateFileRequest,
    tenant_id: &str,
    node: &DriveNodeResponse,
    upload_session: &UploadSessionRecord,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let payload_node_id = payload.id.trim();
    let payload_node_name = payload.node_name.trim();
    let payload_parent_node_id = normalize_optional_id(payload.parent_node_id.as_deref());
    let node_parent_node_id = normalize_optional_id(node.parent_node_id.as_deref());
    let payload_bucket = normalize_optional_id(payload.bucket.as_deref());

    let matches_node = node.id == payload_node_id
        && node.tenant_id == tenant_id
        && node.space_id == payload.space_id
        && node.node_type == "file"
        && node.node_name == payload_node_name
        && node_parent_node_id == payload_parent_node_id;
    let matches_upload_session = upload_session.id == payload.upload_session_id.trim()
        && upload_session.tenant_id == tenant_id
        && upload_session.space_id == payload.space_id
        && upload_session.node_id == payload_node_id
        && upload_session.idempotency_key == payload.idempotency_key.trim()
        && payload_bucket
            .as_deref()
            .map(|bucket| bucket == upload_session.bucket.as_str())
            .unwrap_or(true);

    if matches_node && matches_upload_session {
        return Ok(());
    }

    Err(problem(
        StatusCode::CONFLICT,
        "conflict",
        "idempotencyKey already belongs to a different file creation request",
        "drive.conflict",
    ))
}
pub(crate) async fn ensure_no_live_name_conflict(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    parent_node_id: Option<&str>,
    node_name: &str,
    excluded_node_id: Option<&str>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_node
         WHERE tenant_id=$1
           AND space_id=$2
           AND node_name=$3
           AND lifecycle_status != 'deleted'
           AND ((parent_node_id IS NULL AND $4 IS NULL) OR parent_node_id = $4)
           AND ($5 IS NULL OR id != $5)",
    )
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_name)
    .bind(parent_node_id)
    .bind(excluded_node_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "check dr_drive_node name conflict failed",
    ))?;
    if count > 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "node name already exists in parent",
            "drive.conflict",
        ));
    }
    Ok(())
}
pub(crate) async fn ensure_node_id_available(
    pool: &AnyPool,
    node_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_node
         WHERE id=$1",
    )
    .bind(node_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error("check dr_drive_node id conflict failed"))?;
    if count > 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "node id already exists",
            "drive.conflict",
        ));
    }
    Ok(())
}
pub(crate) async fn copy_active_storage_object_metadata(
    pool: &AnyPool,
    tenant_id: &str,
    target_space_id: &str,
    source_node_id: &str,
    target_node_id: &str,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            scene, source, content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         )
         SELECT $4 || '-copy-' || id, tenant_id, $3, version_no, storage_provider_id,
                bucket, object_key, scene, source, content_type, content_length, checksum_sha256_hex,
                lifecycle_status, $5, $5
         FROM dr_drive_storage_object
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(source_node_id)
    .bind(target_node_id)
    .bind(target_node_id)
    .bind(operator_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "copy dr_drive_storage_object metadata failed",
    ))?;

    let copied_objects = sqlx::query(
        "SELECT id, version_no, content_type, content_length, checksum_sha256_hex, scene, source
         FROM dr_drive_storage_object
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
         ORDER BY version_no ASC, id ASC",
    )
    .bind(tenant_id)
    .bind(target_node_id)
    .fetch_all(pool)
    .await
    .map_err(internal_sql_error(
        "list copied dr_drive_storage_object metadata failed",
    ))?;

    for row in copied_objects {
        let storage_object_id: String = row.get("id");
        let version_no: i64 = row.get("version_no");
        let content_type: String = row.get("content_type");
        let content_length: i64 = row.get("content_length");
        let checksum_sha256_hex: String = row.get("checksum_sha256_hex");
        let scene: Option<String> = row.get("scene");
        let source: Option<String> = row.get("source");
        insert_node_version_metadata(
            pool,
            NodeVersionStorageMetadata {
                tenant_id,
                space_id: target_space_id,
                node_id: target_node_id,
                version_no,
                storage_object_id: &storage_object_id,
                content_type: &content_type,
                content_length,
                checksum_sha256_hex: &checksum_sha256_hex,
            },
            NodeVersionAttribution {
                version_kind: "auto",
                change_source: "app_api",
                change_summary: Some("Copied Drive storage object metadata into a new node"),
                app_id: None,
                app_resource_type: None,
                app_resource_id: None,
                scene: scene.as_deref(),
                source: source.as_deref(),
            },
            operator_id,
        )
        .await?;
    }
    Ok(())
}
