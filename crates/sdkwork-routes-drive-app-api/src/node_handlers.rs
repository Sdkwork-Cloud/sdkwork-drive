use crate::acl;
use crate::acl_sql;
use crate::app_context::DriveRequestContext;
use crate::archive::*;
use crate::archive_storage::read_archive_node_bytes;
use crate::dto::*;
use crate::error::{
    internal_problem, internal_sql_error, is_unique_constraint_error, map_service_error, not_found_problem, problem, unique_node_insert_conflict_target, ProblemDetail,
};
use crate::ids::next_drive_id;
use crate::mappers::*;
use crate::metadata_repository::{present_drive_node, present_node_list};
use crate::node_repository::{collect_node_subtree, find_active_node, find_node};
use crate::space_repository::validate_space_exists;
use crate::state::AppState;
use crate::validators::*;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use sdkwork_drive_contract::drive::domain_events as drive_events;
use sdkwork_drive_workspace_service::application::upload_service::{
    CreateUploadSessionCommand, DriveUploadService,
};
use sdkwork_drive_workspace_service::infrastructure::sql::upload_session_store::SqlUploadSessionStore;
use sdkwork_drive_workspace_service::infrastructure::sql::NODE_API_SELECT_COLUMNS;
use sqlx::Row;

use crate::route_change::record_change;
use crate::space_repository::ensure_git_repository_space_root_accepts_node_type;
use crate::node_repository::resolve_node_path;
use crate::node_support::*;
use crate::upload_support::*;

pub(crate) async fn list_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(space_id): Path<String>,
    Query(query): Query<ListNodesQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let parent_node_id = normalize_optional_text(query.parent_node_id);
    validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &space_id,
        parent_node_id.as_deref(),
    )
    .await?;
    acl::ensure_list_parent_reader(&state.pool, &ctx, &space_id, parent_node_id.as_deref()).await?;
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;

    let pool = state.pool.clone();
    let tenant_id_for_fetch = tenant_id.clone();
    let space_id_for_fetch = space_id.clone();
    let parent_node_id_for_fetch = parent_node_id.clone();
    let subject_type_for_fetch = subject_type.clone();
    let subject_id_for_fetch = subject_id.clone();
    let is_space_owner = acl::is_subject_space_owner(
        &state.pool,
        &tenant_id,
        &space_id,
        &subject_type,
        &subject_id,
    )
    .await?;
    let reader_acl_predicate =
        acl_sql::reader_inherited_permission_exists_sql("dr_drive_node", "$4", "$5");
    let order_by =
        parse_nodes_list_order_clause(query.sort_by.clone(), query.sort_order.clone())?.to_string();

    let (items, next_page_token, incomplete_page) = if is_space_owner {
        let order_by = order_by.clone();
        let (items, next_page_token) = acl::paginate_offset_limited_items(
            page,
            move |scan_offset, batch_limit| {
                let pool = pool.clone();
                let tenant_id = tenant_id_for_fetch.clone();
                let space_id = space_id_for_fetch.clone();
                let parent_node_id = parent_node_id_for_fetch.clone();
                let order_by = order_by.clone();
                async move {
                    let rows = sqlx::query(&format!(
                        "SELECT {NODE_API_SELECT_COLUMNS}
                         FROM dr_drive_node
                         WHERE tenant_id=$1
                           AND space_id=$2
                           AND lifecycle_status='active'
                           AND content_state='ready'
                           AND ((parent_node_id IS NULL AND $3 IS NULL) OR parent_node_id = $3)
                         ORDER BY {order_by}
                         LIMIT $4 OFFSET $5",
                    ))
                    .bind(&tenant_id)
                    .bind(&space_id)
                    .bind(parent_node_id.as_deref())
                    .bind(batch_limit as i64)
                    .bind(scan_offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(internal_sql_error("list dr_drive_node failed"))?;
                    Ok(rows)
                }
            },
            map_node_row,
        )
        .await?;
        (items, next_page_token, false)
    } else {
        let order_by = order_by.clone();
        let (items, next_page_token) = acl::paginate_offset_limited_items(
            page,
            move |scan_offset, batch_limit| {
                let pool = pool.clone();
                let tenant_id = tenant_id_for_fetch.clone();
                let space_id = space_id_for_fetch.clone();
                let parent_node_id = parent_node_id_for_fetch.clone();
                let subject_type = subject_type_for_fetch.clone();
                let subject_id = subject_id_for_fetch.clone();
                let reader_acl_predicate = reader_acl_predicate.clone();
                let order_by = order_by.clone();
                async move {
                    let rows = sqlx::query(&format!(
                        "SELECT {NODE_API_SELECT_COLUMNS}
                         FROM dr_drive_node
                         WHERE tenant_id=$1
                           AND space_id=$2
                           AND lifecycle_status='active'
                           AND content_state='ready'
                           AND ((parent_node_id IS NULL AND $3 IS NULL) OR parent_node_id = $3)
                           AND ({reader_acl_predicate})
                         ORDER BY {order_by}
                         LIMIT $6 OFFSET $7",
                    ))
                    .bind(&tenant_id)
                    .bind(&space_id)
                    .bind(parent_node_id.as_deref())
                    .bind(&subject_type)
                    .bind(&subject_id)
                    .bind(batch_limit as i64)
                    .bind(scan_offset)
                    .fetch_all(&pool)
                    .await
                    .map_err(internal_sql_error("list dr_drive_node failed"))?;
                    Ok(rows)
                }
            },
            map_node_row,
        )
        .await?;
        (items, next_page_token, false)
    };

    Ok(Json(
        present_node_list(
            &state.pool,
            &tenant_id,
            items,
            next_page_token,
            incomplete_page,
        )
        .await?,
    ))
}
pub(crate) async fn create_folder(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateFolderRequest>,
) -> Result<(StatusCode, Json<DriveNodeResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node_name = payload.node_name.trim();
    if node_name.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "nodeName is required",
            "drive.validation.failed",
        ));
    }
    validate_space_exists(&state.pool, &tenant_id, &payload.space_id).await?;
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
    )
    .await?;
    let parent_acl_node_id = payload
        .parent_node_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if let Some(parent_id) = parent_acl_node_id {
        acl::ensure_ctx_node_role(&state.pool, &ctx, &payload.space_id, parent_id, "writer")
            .await?;
    } else {
        acl::ensure_parent_writer(&state.pool, &ctx, &payload.space_id, None).await?;
    }
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        "folder",
    )
    .await?;

    let node_id = match payload
        .id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(client_id) => {
            if let Ok(existing) = find_node(&state.pool, &tenant_id, client_id).await {
                if folder_create_request_matches(&existing, &payload, node_name) {
                    return Ok((StatusCode::CREATED, Json(present_drive_node(&state.pool, &tenant_id, existing).await?)));
                }
                return Err(problem(
                    StatusCode::CONFLICT,
                    "conflict",
                    "node id already exists",
                    "drive.conflict",
                ));
            }
            ensure_node_id_available(&state.pool, client_id).await?;
            client_id.to_string()
        }
        None => next_drive_id("folder"),
    };

    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        node_name,
        None,
    )
    .await?;

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, 'folder', $5, 'ready', 'active', 1, $6, $6)",
    )
    .bind(&node_id)
    .bind(&tenant_id)
    .bind(&payload.space_id)
    .bind(&payload.parent_node_id)
    .bind(node_name)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            let detail = if unique_node_insert_conflict_target(&error) == "id" {
                "node id already exists"
            } else {
                "node name already exists in parent"
            };
            return problem(StatusCode::CONFLICT, "conflict", detail, "drive.conflict");
        }
        internal_problem(format!("insert dr_drive_node failed: {error}"))
    })?;

    record_change(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        Some(&node_id),
        drive_events::node::CREATED,
        &operator_id,
    )
    .await?;

    let node = present_drive_node(&state.pool, &tenant_id, find_node(&state.pool, &tenant_id, &node_id).await?).await?;
    Ok((StatusCode::CREATED, Json(node)))
}
pub(crate) async fn create_file(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateFileRequest>,
) -> Result<(StatusCode, Json<CreateFileResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    let _client_requested_object_key = payload.object_key.as_deref();
    if payload.id.trim().is_empty()
        || payload.node_name.trim().is_empty()
        || payload.upload_session_id.trim().is_empty()
        || payload.idempotency_key.trim().is_empty()
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "id, nodeName, uploadSessionId, and idempotencyKey are required",
            "drive.validation.failed",
        ));
    }
    validate_optional_future_epoch_ms(Some(payload.expires_at_epoch_ms), "expiresAtEpochMs")?;
    if let Some(existing_upload_session) = find_upload_session_by_idempotency(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.id.trim(),
        payload.idempotency_key.trim(),
    )
    .await?
    {
        let node = find_active_node(&state.pool, &tenant_id, payload.id.trim()).await?;
        validate_create_file_idempotent_replay(
            &payload,
            &tenant_id,
            &node,
            &existing_upload_session,
        )?;
        return Ok((
            StatusCode::CREATED,
            Json(CreateFileResponse {
                node,
                upload_session: CreateUploadSessionResponse::from(existing_upload_session),
            }),
        ));
    }
    validate_space_exists(&state.pool, &tenant_id, &payload.space_id).await?;
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
    )
    .await?;
    if let Some(parent_id) = payload
        .parent_node_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        acl::ensure_ctx_node_role(&state.pool, &ctx, &payload.space_id, parent_id, "writer")
            .await?;
    } else {
        acl::ensure_parent_writer(&state.pool, &ctx, &payload.space_id, None).await?;
    }
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        "file",
    )
    .await?;
    ensure_node_id_available(&state.pool, payload.id.trim()).await?;
    ensure_upload_session_id_available(&state.pool, payload.upload_session_id.trim()).await?;
    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        &payload.node_name,
        None,
    )
    .await?;

    let storage_target = resolve_storage_target(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.bucket.as_deref(),
        &payload.id,
        payload.upload_session_id.trim(),
        1,
    )
    .await?;
    let created_storage_upload = initiate_storage_multipart_upload(&state, &storage_target).await?;

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, 'file', $5, 'uploading', 'active', 1, $6, $6)",
    )
    .bind(payload.id.trim())
    .bind(&tenant_id)
    .bind(&payload.space_id)
    .bind(&payload.parent_node_id)
    .bind(payload.node_name.trim())
    .bind(operator_id.as_str())
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "node name already exists in parent",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert file dr_drive_node failed: {error}"))
    })?;

    let service = DriveUploadService::new(SqlUploadSessionStore::new(state.pool.clone()));
    let created = service
        .create_upload_session(CreateUploadSessionCommand {
            session_id: payload.upload_session_id.trim().to_string(),
            tenant_id: tenant_id.clone(),
            space_id: payload.space_id.clone(),
            node_id: payload.id.trim().to_string(),
            bucket: storage_target.bucket,
            object_key: storage_target.object_key,
            storage_provider_id: storage_target.provider_id,
            storage_upload_id: Some(created_storage_upload.upload_id),
            idempotency_key: payload.idempotency_key.trim().to_string(),
            operator_id: operator_id.as_str().to_string(),
            expires_at_epoch_ms: payload.expires_at_epoch_ms,
        })
        .await
        .map_err(map_service_error)?;
    record_change(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        Some(payload.id.trim()),
        drive_events::node::CREATED,
        operator_id.as_str(),
    )
    .await?;

    let upload_session_state = upload_session_state_as_str(&created.state).to_string();
    let node = present_drive_node(
        &state.pool,
        &tenant_id,
        find_node(&state.pool, &tenant_id, payload.id.trim()).await?,
    )
    .await?;
    Ok((
        StatusCode::CREATED,
        Json(CreateFileResponse {
            node,
            upload_session: CreateUploadSessionResponse {
                id: created.id,
                tenant_id: created.tenant_id,
                space_id: created.space_id,
                node_id: created.node_id,
                bucket: created.bucket,
                object_key: created.object_key,
                idempotency_key: created.idempotency_key,
                storage_provider_id: created.storage_provider_id,
                storage_upload_id: created.storage_upload_id,
                state: upload_session_state,
                expires_at_epoch_ms: created.expires_at_epoch_ms,
                version: created.version,
            },
        }),
    ))
}
pub(crate) async fn create_shortcut(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateShortcutRequest>,
) -> Result<(StatusCode, Json<DriveNodeResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    if payload.id.trim().is_empty()
        || payload.node_name.trim().is_empty()
        || payload.target_node_id.trim().is_empty()
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "id, nodeName, and targetNodeId are required",
            "drive.validation.failed",
        ));
    }
    validate_space_exists(&state.pool, &tenant_id, &payload.space_id).await?;
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
    )
    .await?;
    acl::ensure_parent_writer(
        &state.pool,
        &ctx,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
    )
    .await?;
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        "shortcut",
    )
    .await?;
    let target = find_active_node(&state.pool, &tenant_id, payload.target_node_id.trim()).await?;
    if target.id == payload.id.trim() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "targetNodeId cannot be the shortcut node",
            "drive.validation.failed",
        ));
    }
    if target.space_id != payload.space_id {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "targetNodeId must reference a node in the same space",
            "drive.validation.failed",
        ));
    }
    acl::ensure_ctx_node_role(&state.pool, &ctx, &target.space_id, &target.id, "reader").await?;
    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        payload.parent_node_id.as_deref(),
        payload.node_name.trim(),
        None,
    )
    .await?;

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, shortcut_target_node_id,
            node_type, node_name, content_state, lifecycle_status, version,
            created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, 'shortcut', $6, 'ready', 'active', 1, $7, $7)",
    )
    .bind(payload.id.trim())
    .bind(&tenant_id)
    .bind(&payload.space_id)
    .bind(&payload.parent_node_id)
    .bind(target.id.as_str())
    .bind(payload.node_name.trim())
    .bind(operator_id.as_str())
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "node name already exists in parent",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert shortcut dr_drive_node failed: {error}"))
    })?;

    record_change(
        &state.pool,
        &tenant_id,
        &payload.space_id,
        Some(payload.id.trim()),
        drive_events::node::CREATED,
        operator_id.as_str(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(
            present_drive_node(
                &state.pool,
                &tenant_id,
                find_node(&state.pool, &tenant_id, payload.id.trim()).await?,
            )
            .await?,
        ),
    ))
}
pub(crate) async fn get_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "reader").await?;
    Ok(Json(present_drive_node(&state.pool, &tenant_id, node).await?))
}
pub(crate) async fn get_node_path(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<NodePathResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "reader").await?;
    let items = resolve_node_path(&state.pool, &tenant_id, &node_id).await?;
    let path_segments = items
        .iter()
        .map(|item| item.node_name.clone())
        .collect::<Vec<_>>();
    Ok(Json(NodePathResponse {
        items,
        path_segments,
    }))
}
pub(crate) async fn get_node_capabilities(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeCapabilitiesQuery>,
) -> Result<Json<NodeCapabilitiesResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(query.subject_type, query.subject_id)?;
    validate_subject_type(&subject_type)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    validate_space_exists(&state.pool, &tenant_id, &node.space_id).await?;
    let owner_row = sqlx::query(
        "SELECT owner_subject_type, owner_subject_id
         FROM dr_drive_space
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(&tenant_id)
    .bind(&node.space_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error(
        "read dr_drive_space owner for capabilities failed",
    ))?;
    let Some(owner_row) = owner_row else {
        return Err(not_found_problem("space not found"));
    };
    let owner_subject_type: String = owner_row.get("owner_subject_type");
    let owner_subject_id: String = owner_row.get("owner_subject_id");
    if owner_subject_type == subject_type && owner_subject_id == subject_id {
        return Ok(Json(build_node_capabilities_response(
            NodeCapabilitiesInput {
                tenant_id,
                node_id,
                subject_type,
                subject_id,
                role: "owner".to_string(),
                source: "space_owner".to_string(),
                permission_id: None,
                inherited: false,
                inherited_from_node_id: None,
                node_lifecycle_status: &node.lifecycle_status,
            },
        )));
    }

    let node_path = resolve_node_path(&state.pool, &tenant_id, &node_id).await?;
    for path_node in node_path.iter().rev() {
        let row = sqlx::query(
            "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
             FROM dr_drive_node_permission
             WHERE tenant_id=$1
               AND node_id=$2
               AND subject_type=$3
               AND subject_id=$4
               AND lifecycle_status='active'
             ORDER BY id ASC
             LIMIT 1",
        )
        .bind(&tenant_id)
        .bind(&path_node.id)
        .bind(&subject_type)
        .bind(&subject_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal_sql_error(
            "read dr_drive_node_permission for capabilities failed",
        ))?;
        if let Some(row) = row {
            let permission = map_permission_row(&row);
            let inherited = permission.node_id != node_id;
            return Ok(Json(build_node_capabilities_response(
                NodeCapabilitiesInput {
                    tenant_id,
                    node_id,
                    subject_type,
                    subject_id,
                    role: permission.role,
                    source: "permission".to_string(),
                    permission_id: Some(permission.id),
                    inherited,
                    inherited_from_node_id: inherited.then_some(permission.node_id),
                    node_lifecycle_status: &node.lifecycle_status,
                },
            )));
        }
    }

    Err(not_found_problem("node not found"))
}
pub(crate) async fn list_archive_entries(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<ArchiveEntryListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "reader").await?;
    let archive_bytes = read_archive_node_bytes(&state, &tenant_id, &node_id).await?;
    let items = read_archive_entry_list(&archive_bytes)?;
    Ok(Json(ArchiveEntryListResponse { items }))
}
pub(crate) async fn extract_archive_entries(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<ExtractArchiveEntriesRequest>,
) -> Result<(StatusCode, Json<ExtractArchiveEntriesResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let source_node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &source_node.space_id, &node_id, "reader").await?;
    validate_archive_source_node(&source_node)?;
    let target_parent_node_id =
        normalize_optional_text(payload.target_parent_node_id).or(source_node.parent_node_id);
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &source_node.space_id,
        target_parent_node_id.as_deref(),
    )
    .await?;
    acl::ensure_parent_writer(
        &state.pool,
        &ctx,
        &source_node.space_id,
        target_parent_node_id.as_deref(),
    )
    .await?;
    let requested_paths = normalize_archive_entry_selection(payload.entry_paths)?;
    let archive_bytes = read_archive_node_bytes(&state, &tenant_id, &node_id).await?;
    let files = read_archive_files_for_extract(&archive_bytes, requested_paths.as_ref())?;
    if files.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "entryPaths did not match any file entries in archive",
            "drive.validation.failed",
        ));
    }
    validate_archive_extraction_plan(
        &state.pool,
        &tenant_id,
        &source_node.space_id,
        target_parent_node_id.as_deref(),
        &files,
    )
    .await?;

    let mut created_nodes = Vec::with_capacity(files.len());
    for file in files {
        let parent_id = ensure_archive_parent_folders(
            &state.pool,
            &tenant_id,
            &source_node.space_id,
            target_parent_node_id.as_deref(),
            &file.path.segments[..file.path.segments.len().saturating_sub(1)],
            &operator_id,
        )
        .await?;
        let created = create_extracted_archive_file(
            &state,
            &tenant_id,
            &source_node.space_id,
            parent_id.as_deref(),
            &file,
            &operator_id,
        )
        .await?;
        created_nodes.push(created);
    }

    Ok((
        StatusCode::CREATED,
        Json(ExtractArchiveEntriesResponse {
            extracted_count: created_nodes.len() as i64,
            items: created_nodes,
        }),
    ))
}
pub(crate) async fn update_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<UpdateNodeRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &current.space_id, &node_id, "writer").await?;
    let next_name = payload
        .node_name
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| current.node_name.clone());
    let next_parent = payload
        .parent_node_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| current.parent_node_id.clone());
    if next_parent.as_deref() == Some(node_id.as_str()) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "parentNodeId cannot be the updated node",
            "drive.validation.failed",
        ));
    }
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &current.space_id,
        next_parent.as_deref(),
    )
    .await?;
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &current.space_id,
        next_parent.as_deref(),
        &current.node_type,
    )
    .await?;
    ensure_target_parent_is_not_descendant(
        &state.pool,
        &tenant_id,
        &current.space_id,
        next_parent.as_deref(),
        &node_id,
    )
    .await?;
    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &current.space_id,
        next_parent.as_deref(),
        &next_name,
        Some(&node_id),
    )
    .await?;

    let affected = sqlx::query(
        "UPDATE dr_drive_node
         SET node_name=$1, parent_node_id=$2, updated_by=$3, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$4 AND id=$5 AND lifecycle_status='active'",
    )
    .bind(next_name)
    .bind(next_parent)
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("node not found"));
    }

    record_change(
        &state.pool,
        &tenant_id,
        &current.space_id,
        Some(&node_id),
        drive_events::node::UPDATED,
        &operator_id,
    )
    .await?;

    Ok(Json(present_drive_node(&state.pool, &tenant_id, find_node(&state.pool, &tenant_id, &node_id).await?).await?))
}
pub(crate) async fn move_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<MoveNodeRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &current.space_id, &node_id, "writer").await?;
    let target_parent = normalize_optional_text(payload.target_parent_node_id);

    if target_parent.as_deref() == Some(node_id.as_str()) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "targetParentNodeId cannot be the moved node",
            "drive.validation.failed",
        ));
    }
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &current.space_id,
        target_parent.as_deref(),
    )
    .await?;
    acl::ensure_parent_writer(
        &state.pool,
        &ctx,
        &current.space_id,
        target_parent.as_deref(),
    )
    .await?;
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &current.space_id,
        target_parent.as_deref(),
        &current.node_type,
    )
    .await?;
    ensure_target_parent_is_not_descendant(
        &state.pool,
        &tenant_id,
        &current.space_id,
        target_parent.as_deref(),
        &node_id,
    )
    .await?;
    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &current.space_id,
        target_parent.as_deref(),
        &current.node_name,
        Some(&node_id),
    )
    .await?;

    let affected = sqlx::query(
        "UPDATE dr_drive_node
         SET parent_node_id=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$3 AND id=$4 AND lifecycle_status='active'",
    )
    .bind(target_parent.as_deref())
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("move dr_drive_node failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("node not found"));
    }

    record_change(
        &state.pool,
        &tenant_id,
        &current.space_id,
        Some(&node_id),
        drive_events::node::MOVED,
        &operator_id,
    )
    .await?;
    Ok(Json(present_drive_node(&state.pool, &tenant_id, find_node(&state.pool, &tenant_id, &node_id).await?).await?))
}
pub(crate) async fn copy_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CopyNodeRequest>,
) -> Result<(StatusCode, Json<DriveNodeResponse>), (StatusCode, Json<ProblemDetail>)> {
    if payload.id.trim().is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "id is required",
            "drive.validation.failed",
        ));
    }

    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let source = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &source.space_id, &node_id, "reader").await?;
    let target_space_id = payload
        .target_space_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| source.space_id.clone());
    let target_parent = normalize_optional_text(payload.target_parent_node_id)
        .or_else(|| source.parent_node_id.clone());
    let target_name = payload
        .node_name
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| source.node_name.clone());
    let content_state = read_node_content_state(&state.pool, &tenant_id, &node_id).await?;

    validate_space_exists(&state.pool, &tenant_id, &target_space_id).await?;
    validate_target_parent(
        &state.pool,
        &tenant_id,
        &target_space_id,
        target_parent.as_deref(),
    )
    .await?;
    acl::ensure_parent_writer(
        &state.pool,
        &ctx,
        &target_space_id,
        target_parent.as_deref(),
    )
    .await?;
    ensure_git_repository_space_root_accepts_node_type(
        &state.pool,
        &tenant_id,
        &target_space_id,
        target_parent.as_deref(),
        &source.node_type,
    )
    .await?;
    ensure_no_live_name_conflict(
        &state.pool,
        &tenant_id,
        &target_space_id,
        target_parent.as_deref(),
        &target_name,
        None,
    )
    .await?;

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, shortcut_target_node_id,
            node_type, node_name, content_state, lifecycle_status, version,
            created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 1, $9, $9)",
    )
    .bind(payload.id.trim())
    .bind(&tenant_id)
    .bind(&target_space_id)
    .bind(target_parent.as_deref())
    .bind(source.shortcut_target_node_id.as_deref())
    .bind(&source.node_type)
    .bind(&target_name)
    .bind(&content_state)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "node name already exists in parent",
                "drive.conflict",
            );
        }
        internal_problem(format!("copy dr_drive_node failed: {error}"))
    })?;

    copy_active_storage_object_metadata(
        &state.pool,
        &tenant_id,
        &target_space_id,
        &node_id,
        payload.id.trim(),
        &operator_id,
    )
    .await?;
    record_change(
        &state.pool,
        &tenant_id,
        &target_space_id,
        Some(payload.id.trim()),
        drive_events::node::COPIED,
        &operator_id,
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(
            present_drive_node(
                &state.pool,
                &tenant_id,
                find_node(&state.pool, &tenant_id, payload.id.trim()).await?,
            )
            .await?,
        ),
    ))
}
pub(crate) async fn delete_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<DeleteNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "writer").await?;
    let nodes_to_delete = collect_node_subtree(&state.pool, &tenant_id, &node).await?;
    let mut deleted_count = 0_u64;

    for node_to_delete in &nodes_to_delete {
        let affected = sqlx::query(
            "UPDATE dr_drive_node
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$2 AND id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_to_delete.id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("delete dr_drive_node failed"))?
        .rows_affected();
        deleted_count += affected;

        sqlx::query(
            "UPDATE dr_drive_storage_object
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_to_delete.id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error(
            "delete dr_drive_storage_object metadata failed",
        ))?;

        if affected > 0 {
            record_change(
                &state.pool,
                &tenant_id,
                &node_to_delete.space_id,
                Some(&node_to_delete.id),
                drive_events::node::DELETED,
                &operator_id,
            )
            .await?;
        }
    }
    Ok(Json(DeleteNodeResponse {
        deleted: deleted_count > 0,
    }))
}
