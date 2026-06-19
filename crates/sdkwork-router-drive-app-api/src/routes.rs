use crate::app_context::{inject_drive_request_context, DriveRequestContext};
use crate::archive::*;
use crate::archive_storage::read_archive_node_bytes;
use crate::collaboration_repository::{find_comment, find_comment_reply, find_share_link};
use crate::constants::*;
use crate::dto::*;
use crate::error::{
    internal_problem, internal_sql_error, is_unique_constraint_error, map_download_token_error,
    map_object_store_route_error, map_service_error, not_found_problem, problem,
    service_error_kind, unique_node_insert_conflict_target, ProblemDetail,
};
use crate::handlers::*;
use crate::hashing::sha256_hex;
use crate::ids::next_drive_id;
use crate::mappers::*;
use crate::metadata_repository::{find_label, find_node_label, find_node_property};
use crate::node_repository::{collect_node_subtree, find_active_node, find_node};
use crate::object_store::{
    build_download_service, build_s3_object_store_for_provider,
    find_active_storage_provider_by_bucket, find_storage_provider_by_id,
    missing_signing_provider_error, require_active_storage_provider,
    unsupported_signing_provider_error, AppDownloadSigner, UploadPartSignCommand,
};
use crate::space_repository::{validate_space_exists, validate_space_exists_for_change_history};
use crate::state::AppState;
use crate::storage_keys::*;
use crate::time::current_epoch_ms;
use crate::uploader::{map_uploader_upload_item_row, prepare_uploader_command};
use crate::validators::*;
use crate::watch_repository::find_watch_channel;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::StatusCode;
use axum::middleware;
use axum::response::IntoResponse;
use axum::response::Redirect;
use axum::response::Response;
use axum::routing::{get, post, put};
use axum::Extension;
use axum::{Json, Router};
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_observability::{elapsed_ms, error_kinds, events, has_value, start_timer};
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_drive_storage_contract::{
    AbortMultipartUploadRequest, CompleteMultipartUploadRequest, CompletedMultipartPart,
    CreateMultipartUploadRequest, DriveObjectLocator, DriveObjectStore, PutObjectRequest,
};
use sdkwork_drive_workspace_service::application::download_service::{
    CreateDownloadUrlCommand, ResolveDownloadTokenCommand,
};
use sdkwork_drive_workspace_service::application::quota_enforcement::ensure_tenant_can_allocate_bytes;
use sdkwork_drive_workspace_service::application::quota_service::{
    DriveQuotaService, GetTenantQuotaSummaryCommand,
};
use sdkwork_drive_workspace_service::application::space_service::{
    CreateSpaceCommand, DeleteSpaceCommand, DriveSpaceService, GetSpaceCommand, UpdateSpaceCommand,
};
use sdkwork_drive_workspace_service::application::storage_key_service::{
    BuildStorageObjectKeyCommand, DriveStorageKeyService,
};
use sdkwork_drive_workspace_service::application::upload_service::{
    CreateUploadSessionCommand, DriveUploadService,
};
use sdkwork_drive_workspace_service::application::uploader_service::{
    DriveUploaderService, MarkUploaderPartUploadedCommand,
};
use sdkwork_drive_workspace_service::domain::space::DriveSpaceType;
use sdkwork_drive_workspace_service::domain::upload::DriveUploadSessionState;
use sdkwork_drive_workspace_service::domain::uploader::{content_type_group_for, DriveUploadItem};
use sdkwork_drive_workspace_service::drive_share_token_hash;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::spawn_pending_outbox_dispatch;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sdkwork_drive_workspace_service::infrastructure::sql::next_drive_runtime_id;
use sdkwork_drive_workspace_service::infrastructure::sql::node_head_metadata::{
    apply_file_node_head_snapshot, file_extension_from_name, FileNodeHeadSnapshot,
};
use sdkwork_drive_workspace_service::infrastructure::sql::quota_store::SqlQuotaStore;
use sdkwork_drive_workspace_service::infrastructure::sql::space_store::SqlSpaceStore;
use sdkwork_drive_workspace_service::infrastructure::sql::upload_query_columns::DRIVE_UPLOAD_ITEM_SELECT_COLUMNS;
use sdkwork_drive_workspace_service::infrastructure::sql::upload_session_store::SqlUploadSessionStore;
use sdkwork_drive_workspace_service::infrastructure::sql::uploader_store::SqlUploaderStore;
use sdkwork_drive_workspace_service::infrastructure::sql::{
    NODE_API_SELECT_COLUMNS, NODE_API_SELECT_JOIN_COLUMNS,
};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use sqlx::Row;
use std::collections::{BTreeMap, BTreeSet};

pub fn build_router() -> Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite any pool for app api");
    build_router_with_state(AppState::new(pool), true)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_pool_and_iam_policy(
        pool,
        DriveAuthValidationPolicy::allow_unsigned_for_development(),
    )
}

pub fn build_router_with_pool_and_iam(pool: AnyPool) -> Router {
    build_router_with_state(AppState::new(pool), true)
}

pub fn build_router_with_pool_and_iam_policy(
    pool: AnyPool,
    auth_policy: DriveAuthValidationPolicy,
) -> Router {
    build_router_with_state(
        AppState::with_urls_and_auth_policy(pool, DEFAULT_DOWNLOAD_PUBLIC_BASE_URL, auth_policy),
        true,
    )
}

pub async fn build_router_with_database_url(database_url: &str) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    let pool = connect_any_database_and_install_schema(&config).await?;
    Ok(build_router_with_state(
        AppState::with_urls(
            pool,
            std::env::var("SDKWORK_DRIVE_PUBLIC_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string()),
        ),
        true,
    ))
}

pub async fn build_router_with_database_config(
    config: &DatabaseConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let pool = connect_any_database_and_install_schema(config)
        .await
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error + Send + Sync>)?;
    Ok(build_router_with_state(
        AppState::with_urls(
            pool,
            std::env::var("SDKWORK_DRIVE_PUBLIC_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string()),
        ),
        true,
    ))
}

fn build_router_with_state(state: AppState, require_iam: bool) -> Router {
    let mut drive_routes = Router::new()
        .route(
            "/app/v3/api/drive/spaces",
            get(list_spaces).post(create_space),
        )
        .route(
            "/app/v3/api/drive/spaces/{space_id}",
            get(get_space).patch(update_space).delete(delete_space),
        )
        .route(
            "/app/v3/api/drive/upload_sessions",
            post(create_upload_session),
        )
        .route(
            "/app/v3/api/drive/uploader/uploads",
            post(prepare_uploader_upload),
        )
        .route(
            "/app/v3/api/drive/uploader/uploads/{upload_item_id}/parts/{part_no}",
            put(mark_uploader_part_uploaded),
        )
        .route(
            "/app/v3/api/drive/upload_sessions/{upload_session_id}",
            get(get_upload_session),
        )
        .route("/app/v3/api/drive/spaces/{space_id}/nodes", get(list_nodes))
        .route("/app/v3/api/drive/nodes/folders", post(create_folder))
        .route("/app/v3/api/drive/nodes/files", post(create_file))
        .route("/app/v3/api/drive/nodes/shortcuts", post(create_shortcut))
        .route(
            "/app/v3/api/drive/nodes/{node_id}",
            get(get_node).patch(update_node).delete(delete_node),
        )
        .route("/app/v3/api/drive/nodes/{node_id}/path", get(get_node_path))
        .route("/app/v3/api/drive/nodes/{node_id}/move", post(move_node))
        .route("/app/v3/api/drive/nodes/{node_id}/copy", post(copy_node))
        .route("/app/v3/api/drive/nodes/{node_id}/trash", post(trash_node))
        .route(
            "/app/v3/api/drive/nodes/{node_id}/download_url",
            get(create_node_download_url),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/capabilities",
            get(get_node_capabilities),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/archive_entries",
            get(list_archive_entries),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/archive_entries/extract",
            post(extract_archive_entries),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/properties",
            get(list_node_properties),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/properties/{property_key}",
            put(set_node_property).delete(delete_node_property),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/labels",
            get(list_node_labels),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/labels/{label_id}",
            put(apply_node_label).delete(remove_node_label),
        )
        .route("/app/v3/api/drive/changes/watch", post(watch_changes))
        .route("/app/v3/api/drive/nodes/{node_id}/watch", post(watch_node))
        .route("/app/v3/api/drive/watch_channels", get(list_watch_channels))
        .route(
            "/app/v3/api/drive/watch_channels/{channel_id}",
            get(get_watch_channel),
        )
        .route(
            "/app/v3/api/drive/watch_channels/{channel_id}/stop",
            post(stop_watch_channel),
        )
        .route(
            "/app/v3/api/drive/trash/{node_id}/restore",
            post(restore_trashed_node),
        )
        .route("/app/v3/api/drive/trash", get(list_trashed_nodes))
        .route("/app/v3/api/drive/trash/empty", post(empty_trash))
        .route("/app/v3/api/drive/recent", get(list_recent_nodes))
        .route("/app/v3/api/drive/shared_with_me", get(list_shared_with_me))
        .route("/app/v3/api/drive/favorites", get(list_favorite_nodes))
        .route("/app/v3/api/drive/quotas/summary", get(get_quota_summary))
        .route(
            "/app/v3/api/drive/nodes/{node_id}/favorite",
            put(set_favorite).delete(unset_favorite),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/versions",
            get(list_versions),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/versions/{version_id}/restore",
            post(restore_version),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/versions/{version_id}",
            get(get_version).delete(delete_version),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/permissions",
            get(list_permissions).post(create_permission),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/permissions/effective",
            get(list_effective_permissions),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/permissions/{permission_id}",
            get(get_permission)
                .delete(delete_permission)
                .patch(update_permission),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/share_links",
            get(list_share_links).post(create_share_link),
        )
        .route(
            "/app/v3/api/drive/share_links/{share_link_id}",
            get(get_share_link)
                .delete(revoke_share_link)
                .patch(update_share_link),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/comments",
            get(list_comments).post(create_comment),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/comments/{comment_id}",
            get(get_comment)
                .delete(delete_comment)
                .patch(update_comment),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/comments/{comment_id}/replies",
            get(list_comment_replies).post(create_comment_reply),
        )
        .route(
            "/app/v3/api/drive/nodes/{node_id}/comments/{comment_id}/replies/{reply_id}",
            get(get_comment_reply)
                .delete(delete_comment_reply)
                .patch(update_comment_reply),
        )
        .route("/app/v3/api/drive/search", get(search_nodes))
        .route("/app/v3/api/drive/changes", get(list_changes))
        .route(
            "/app/v3/api/drive/changes/start_page_token",
            get(get_changes_start_page_token),
        )
        .route(
            "/app/v3/api/drive/upload_sessions/{upload_session_id}/parts/{part_no}",
            put(presign_upload_part),
        )
        .route(
            "/app/v3/api/drive/upload_sessions/{upload_session_id}/complete",
            post(complete_upload_session),
        )
        .route(
            "/app/v3/api/drive/upload_sessions/{upload_session_id}/abort",
            post(abort_upload_session),
        )
        .route("/app/v3/api/drive/download_urls", post(create_download_url))
        .route(
            "/app/v3/api/drive/download_packages",
            post(create_download_package),
        )
        .route(
            "/app/v3/api/drive/download_packages/{package_id}/download_url",
            get(resolve_download_package_url),
        )
        .route(
            "/app/v3/api/drive/download_tokens/{token}",
            get(resolve_download_token),
        )
        .route("/app/v3/api/assets", get(list_assets).post(create_asset))
        .route(
            "/app/v3/api/assets/collections",
            get(list_asset_collections).post(create_asset_collection),
        )
        .route(
            "/app/v3/api/assets/collections/{collection_id}/items",
            post(add_asset_collection_item),
        )
        .route(
            "/app/v3/api/assets/collections/{collection_id}/items/{item_id}",
            post(asset_method_not_allowed).delete(delete_asset_collection_item),
        )
        .route(
            "/app/v3/api/assets/{asset_id}",
            get(get_asset).patch(update_asset),
        )
        .route("/app/v3/api/assets/{asset_id}/archive", post(archive_asset))
        .route("/app/v3/api/assets/{asset_id}/restore", post(restore_asset))
        .route(
            "/app/v3/api/assets/{asset_id}/relations",
            post(create_asset_relation),
        )
        .route(
            "/app/v3/api/assets/{asset_id}/relations/{relation_id}",
            post(asset_method_not_allowed).delete(delete_asset_relation),
        );

    drive_routes = drive_routes.route_layer(middleware::from_fn(inject_drive_request_context));

    let forbidden_asset_routes = Router::new()
        .route("/app/v3/api/assets/upload", post(asset_not_found))
        .route("/app/v3/api/assets/presign", post(asset_not_found))
        .route("/app/v3/api/assets/upload_sessions", post(asset_not_found));

    let mut router = Router::new()
        .route("/healthz", get(health))
        .route("/metrics", get(metrics))
        .merge(drive_routes)
        .merge(forbidden_asset_routes)
        .layer(middleware::from_fn(
            sdkwork_drive_http::metrics::record_request_metrics,
        ))
        .with_state(state);

    if require_iam {
        router = crate::web_bootstrap::wrap_router_with_web_framework(
            sdkwork_web_core::DefaultWebRequestContextResolver::default(),
            router,
        );
    }

    router
}

async fn list_spaces(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<ListSpacesQuery>,
) -> Result<Json<ListSpacesResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let filter_has_owner_subject_type = has_value(&query.owner_subject_type);
    let filter_has_owner_subject_id = has_value(&query.owner_subject_id);
    let tenant_id = match ctx.resolve_tenant_id() {
        Ok(tenant_id) => tenant_id,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_LIST,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                filter_has_owner_subject_type = filter_has_owner_subject_type,
                filter_has_owner_subject_id = filter_has_owner_subject_id
            );
            return Err(error);
        }
    };

    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let listed = service
        .list_spaces(
            sdkwork_drive_workspace_service::application::space_service::ListSpacesCommand {
                tenant_id,
                owner_subject_type: query.owner_subject_type,
                owner_subject_id: query.owner_subject_id,
            },
        )
        .await
        .map_err(map_service_error)?;
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_LIST,
        result = "ok",
        latency_ms = latency_ms,
        filter_has_owner_subject_type = filter_has_owner_subject_type,
        filter_has_owner_subject_id = filter_has_owner_subject_id,
        returned_items = listed.len() as u64
    );

    Ok(Json(ListSpacesResponse {
        items: listed.into_iter().map(map_space_response).collect(),
    }))
}

async fn create_space(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateSpaceRequest>,
) -> Result<(StatusCode, Json<CreateSpaceResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let space_type = match DriveSpaceType::try_from_str(payload.space_type.trim()) {
        Some(space_type) => space_type,
        None => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                input_space_type = payload.space_type.as_str()
            );
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "invalid space type",
                "space_type is invalid",
                "drive.validation.space_type_invalid",
            ));
        }
    };

    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let created_result = service
        .create_space(CreateSpaceCommand {
            id: payload.id,
            tenant_id,
            owner_subject_type: payload.owner_subject_type,
            owner_subject_id: payload.owner_subject_id,
            display_name: payload.display_name,
            space_type,
            presentation_icon: payload.presentation_icon,
            presentation_color: payload.presentation_color,
            description: payload.description,
            operator_id,
        })
        .await;
    let created = match created_result {
        Ok(created) => created,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error)
            );
            return Err(map_service_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        space_type = created.space_type.as_str(),
        lifecycle_status = created.lifecycle_status.as_str(),
        version = created.version
    );

    Ok((StatusCode::CREATED, Json(map_space_response(created))))
}

async fn get_space(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(space_id): Path<String>,
) -> Result<Json<CreateSpaceResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let tenant_id = match ctx.resolve_tenant_id() {
        Ok(tenant_id) => tenant_id,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_GET,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                space_id = space_id.as_str()
            );
            return Err(error);
        }
    };
    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let found = match service
        .get_space(GetSpaceCommand {
            tenant_id,
            space_id: space_id.clone(),
        })
        .await
    {
        Ok(found) => found,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_GET,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error),
                space_id = space_id.as_str()
            );
            return Err(map_service_error(error));
        }
    };

    let response = map_space_response(found);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_GET,
        result = "ok",
        latency_ms = elapsed_ms(started),
        space_id = response.id.as_str(),
        space_type = response.space_type.as_str(),
        lifecycle_status = response.lifecycle_status.as_str(),
        version = response.version
    );
    Ok(Json(response))
}

async fn update_space(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(space_id): Path<String>,
    Json(payload): Json<UpdateSpaceRequest>,
) -> Result<Json<CreateSpaceResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let tenant_id = match ctx.resolve_tenant_id() {
        Ok(tenant_id) => tenant_id,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_UPDATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                space_id = space_id.as_str()
            );
            return Err(error);
        }
    };
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let updated = match service
        .update_space(UpdateSpaceCommand {
            tenant_id: tenant_id.clone(),
            space_id: space_id.clone(),
            display_name: payload.display_name,
            presentation_icon: payload.presentation_icon,
            presentation_color: payload.presentation_color,
            description: payload.description,
            operator_id: operator_id.clone(),
        })
        .await
    {
        Ok(updated) => updated,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_UPDATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error),
                space_id = space_id.as_str()
            );
            return Err(map_service_error(error));
        }
    };
    record_change(
        &state.pool,
        &tenant_id,
        &space_id,
        None,
        "space.updated",
        &operator_id,
    )
    .await?;

    let response = map_space_response(updated);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_UPDATE,
        result = "ok",
        latency_ms = elapsed_ms(started),
        space_id = response.id.as_str(),
        lifecycle_status = response.lifecycle_status.as_str(),
        version = response.version
    );
    Ok(Json(response))
}

async fn delete_space(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(space_id): Path<String>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<DeleteSpaceResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let tenant_id = match ctx.resolve_tenant_id() {
        Ok(tenant_id) => tenant_id,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_DELETE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = error_kinds::VALIDATION,
                space_id = space_id.as_str()
            );
            return Err(error);
        }
    };
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool.clone()));
    let deleted = match service
        .delete_space(DeleteSpaceCommand {
            tenant_id: tenant_id.clone(),
            space_id: space_id.clone(),
            operator_id: operator_id.clone(),
        })
        .await
    {
        Ok(deleted) => deleted,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_SPACES_DELETE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error),
                space_id = space_id.as_str()
            );
            return Err(map_service_error(error));
        }
    };
    let deleted_node_count =
        retire_space_contents(&state.pool, &tenant_id, &space_id, &operator_id).await?;
    record_change(
        &state.pool,
        &tenant_id,
        &space_id,
        None,
        "space.deleted",
        &operator_id,
    )
    .await?;

    let response_space = map_space_response(deleted);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_SPACES_DELETE,
        result = "ok",
        latency_ms = elapsed_ms(started),
        space_id = response_space.id.as_str(),
        lifecycle_status = response_space.lifecycle_status.as_str(),
        version = response_space.version,
        deleted_node_count = deleted_node_count
    );
    Ok(Json(DeleteSpaceResponse {
        deleted: true,
        space: response_space,
        deleted_node_count,
    }))
}

async fn create_upload_session(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateUploadSessionRequest>,
) -> Result<(StatusCode, Json<CreateUploadSessionResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let _client_requested_object_key = payload.object_key.as_deref();
    let session_id = payload.session_id.trim();
    let tenant_id = ctx.resolve_tenant_id()?;
    let space_id = payload.space_id.trim();
    let node_id = payload.node_id.trim();
    let idempotency_key = payload.idempotency_key.trim();
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    if idempotency_key.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "idempotencyKey is required",
            "drive.validation.failed",
        ));
    }
    validate_optional_future_epoch_ms(Some(payload.expires_at_epoch_ms), "expiresAtEpochMs")?;
    let node = find_active_node(&state.pool, &tenant_id, node_id).await?;
    if node.space_id != space_id {
        return Err(not_found_problem("node not found"));
    }
    if node.node_type != "file" {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "nodeId must reference an active file",
            "drive.validation.failed",
        ));
    }
    if let Some(existing) = find_upload_session_by_idempotency(
        &state.pool,
        &tenant_id,
        space_id,
        node_id,
        idempotency_key,
    )
    .await?
    {
        return Ok((
            StatusCode::CREATED,
            Json(CreateUploadSessionResponse::from(existing)),
        ));
    }
    ensure_upload_session_id_available(&state.pool, session_id).await?;
    let target_version_no =
        next_storage_object_version_no(&state.pool, &tenant_id, node_id).await?;
    let storage_target = resolve_storage_target(
        &state.pool,
        &tenant_id,
        space_id,
        payload.bucket.as_deref(),
        node_id,
        session_id,
        target_version_no,
    )
    .await?;
    let created_storage_upload = initiate_storage_multipart_upload(&state, &storage_target).await?;
    let service = DriveUploadService::new(SqlUploadSessionStore::new(state.pool.clone()));
    let created_result = service
        .create_upload_session(CreateUploadSessionCommand {
            session_id: session_id.to_string(),
            tenant_id,
            space_id: space_id.to_string(),
            node_id: node_id.to_string(),
            bucket: storage_target.bucket,
            object_key: storage_target.object_key,
            storage_provider_id: storage_target.provider_id,
            storage_upload_id: Some(created_storage_upload.upload_id),
            idempotency_key: idempotency_key.to_string(),
            operator_id,
            expires_at_epoch_ms: payload.expires_at_epoch_ms,
        })
        .await;
    let created = match created_result {
        Ok(created) => created,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_UPLOAD_SESSIONS_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error)
            );
            return Err(map_service_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    let state = upload_session_state_as_str(&created.state);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_UPLOAD_SESSIONS_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        state = state,
        expires_at_epoch_ms = created.expires_at_epoch_ms,
        version = created.version
    );

    Ok((
        StatusCode::CREATED,
        Json(CreateUploadSessionResponse {
            id: created.id,
            tenant_id: created.tenant_id,
            space_id: created.space_id,
            node_id: created.node_id,
            bucket: created.bucket,
            object_key: created.object_key,
            idempotency_key: created.idempotency_key,
            storage_provider_id: created.storage_provider_id,
            storage_upload_id: created.storage_upload_id,
            state: state.to_string(),
            expires_at_epoch_ms: created.expires_at_epoch_ms,
            version: created.version,
        }),
    ))
}

async fn get_upload_session(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(upload_session_id): Path<String>,
) -> Result<Json<UploadSessionMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let upload_session = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    Ok(Json(UploadSessionMutationResponse::from(upload_session)))
}

async fn prepare_uploader_upload(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<PrepareUploaderUploadRequest>,
) -> Result<(StatusCode, Json<PrepareUploaderUploadResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    let command = prepare_uploader_command(payload, &ctx, tenant_id, operator_id)?;
    ensure_tenant_can_allocate_bytes(
        &SqlQuotaStore::new(state.pool.clone()),
        &command.tenant_id,
        command.content_length,
    )
    .await
    .map_err(map_service_error)?;
    let service = DriveUploaderService::new(SqlUploaderStore::new(state.pool.clone()));
    let upload_item = service
        .prepare_upload(command)
        .await
        .map_err(map_service_error)?;
    let upload_session_id = upload_item
        .upload_session_id
        .as_deref()
        .ok_or_else(|| internal_problem("uploader upload session id is missing"))?;
    let mut upload_session =
        find_upload_session(&state.pool, &upload_item.tenant_id, upload_session_id).await?;

    if upload_session.storage_upload_id == upload_session.id {
        let target_version_no = next_storage_object_version_no(
            &state.pool,
            &upload_item.tenant_id,
            &upload_item.node_id,
        )
        .await?;
        let mut storage_target = resolve_storage_target(
            &state.pool,
            &upload_item.tenant_id,
            &upload_item.space_id,
            Some(&upload_session.bucket),
            &upload_item.node_id,
            &upload_item.id,
            target_version_no,
        )
        .await?;
        if let Some(object_key) = uploader_final_object_key(
            upload_session.object_key.as_str(),
            storage_target.object_key.as_str(),
        )? {
            storage_target.object_key = object_key;
        }
        let created_storage_upload =
            initiate_storage_multipart_upload(&state, &storage_target).await?;
        update_uploader_storage_target(
            &state.pool,
            &upload_item.tenant_id,
            &upload_item.id,
            upload_session_id,
            &storage_target,
            &created_storage_upload.upload_id,
        )
        .await?;
        upload_session =
            find_upload_session(&state.pool, &upload_item.tenant_id, upload_session_id).await?;
    }

    let upload_item =
        find_uploader_upload_item(&state.pool, &upload_item.tenant_id, &upload_item.id)
            .await?
            .ok_or_else(|| internal_problem("uploader upload item was not found after prepare"))?;

    Ok((
        StatusCode::CREATED,
        Json(PrepareUploaderUploadResponse {
            upload_item: UploaderUploadItemResponse::from(upload_item),
            upload_session: UploadSessionMutationResponse::from(upload_session),
        }),
    ))
}

async fn mark_uploader_part_uploaded(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((upload_item_id, part_no)): Path<(String, i64)>,
    Json(payload): Json<MarkUploaderPartUploadedRequest>,
) -> Result<Json<UploaderUploadPartResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let upload_session_id = require_non_empty_text(payload.upload_session_id, "uploadSessionId")?;
    let service = DriveUploaderService::new(SqlUploaderStore::new(state.pool.clone()));
    let part = service
        .mark_part_uploaded(MarkUploaderPartUploadedCommand {
            id: format!("upload-part-{upload_item_id}-{part_no}"),
            tenant_id,
            upload_item_id,
            upload_session_id,
            part_no,
            offset_bytes: payload.offset_bytes.into_i64(),
            size_bytes: payload.size_bytes.into_i64(),
            etag: payload.etag,
            checksum_sha256_hex: payload.checksum_sha256_hex,
            uploaded_at_epoch_ms: payload
                .uploaded_at_epoch_ms
                .map(FlexibleI64::into_i64)
                .unwrap_or_else(current_epoch_ms),
        })
        .await
        .map_err(map_service_error)?;
    Ok(Json(UploaderUploadPartResponse::from(part)))
}

async fn list_nodes(
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
    let rows = sqlx::query(&format!(
        "SELECT {NODE_API_SELECT_COLUMNS}
         FROM dr_drive_node
         WHERE tenant_id=$1
           AND space_id=$2
           AND lifecycle_status='active'
           AND content_state='ready'
           AND ((parent_node_id IS NULL AND $3 IS NULL) OR parent_node_id = $3)
         ORDER BY node_type ASC, node_name ASC
         LIMIT $4 OFFSET $5",
    ))
    .bind(&tenant_id)
    .bind(&space_id)
    .bind(parent_node_id.as_deref())
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn create_folder(
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
                    return Ok((StatusCode::CREATED, Json(existing)));
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
        "node.folder_created",
        &operator_id,
    )
    .await?;

    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    Ok((StatusCode::CREATED, Json(node)))
}

fn folder_create_request_matches(
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

async fn create_file(
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
        "node.file_created",
        operator_id.as_str(),
    )
    .await?;

    let upload_session_state = upload_session_state_as_str(&created.state).to_string();
    let node = find_node(&state.pool, &tenant_id, payload.id.trim()).await?;
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

async fn create_shortcut(
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
        "node.shortcut.created",
        operator_id.as_str(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(find_node(&state.pool, &tenant_id, payload.id.trim()).await?),
    ))
}

async fn get_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    Ok(Json(find_node(&state.pool, &tenant_id, &node_id).await?))
}

async fn get_node_path(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<NodePathResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
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

async fn get_node_capabilities(
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

    Ok(Json(build_node_capabilities_response(
        NodeCapabilitiesInput {
            tenant_id,
            node_id,
            subject_type,
            subject_id,
            role: "none".to_string(),
            source: "none".to_string(),
            permission_id: None,
            inherited: false,
            inherited_from_node_id: None,
            node_lifecycle_status: &node.lifecycle_status,
        },
    )))
}

async fn list_archive_entries(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
) -> Result<Json<ArchiveEntryListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let archive_bytes = read_archive_node_bytes(&state, &tenant_id, &node_id).await?;
    let items = read_archive_entry_list(&archive_bytes)?;
    Ok(Json(ArchiveEntryListResponse { items }))
}

async fn extract_archive_entries(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<ExtractArchiveEntriesRequest>,
) -> Result<(StatusCode, Json<ExtractArchiveEntriesResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let source_node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
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

async fn list_node_properties(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodePropertyListQuery>,
) -> Result<Json<NodePropertyListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let visibility = match normalize_optional_text(query.visibility) {
        Some(value) => Some(validate_node_property_visibility(&value)?.to_string()),
        None => None,
    };

    let rows = if let Some(visibility) = visibility.as_deref() {
        sqlx::query(
            "SELECT id, tenant_id, node_id, property_key, property_value, visibility,
                    lifecycle_status, version
             FROM dr_drive_node_property
             WHERE tenant_id=$1
               AND node_id=$2
               AND visibility=$3
               AND lifecycle_status='active'
             ORDER BY property_key ASC, visibility ASC
             LIMIT $4 OFFSET $5",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(visibility)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, tenant_id, node_id, property_key, property_value, visibility,
                    lifecycle_status, version
             FROM dr_drive_node_property
             WHERE tenant_id=$1
               AND node_id=$2
               AND lifecycle_status='active'
             ORDER BY property_key ASC, visibility ASC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_node_property failed"))?;

    let mut items = rows.iter().map(map_node_property_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(NodePropertyListResponse {
        items,
        next_page_token,
    }))
}

async fn set_node_property(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, property_key)): Path<(String, String)>,
    Json(payload): Json<SetNodePropertyRequest>,
) -> Result<Json<NodePropertyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let property_key = validate_node_property_key(&property_key)?.to_string();
    let visibility = validate_node_property_visibility(
        normalize_optional_text(payload.visibility)
            .as_deref()
            .unwrap_or("private"),
    )?
    .to_string();
    let property_value = require_non_empty_text(payload.value, "value")?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let property_id = build_node_property_id(&tenant_id, &node_id, &property_key, &visibility);

    sqlx::query(
        "INSERT INTO dr_drive_node_property (
            id, tenant_id, node_id, property_key, property_value, visibility,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 1, $7, $7)
         ON CONFLICT(tenant_id, node_id, property_key, visibility) DO UPDATE SET
            property_value=excluded.property_value,
            lifecycle_status='active',
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP,
            version=dr_drive_node_property.version + 1",
    )
    .bind(&property_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&property_key)
    .bind(&property_value)
    .bind(&visibility)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("upsert dr_drive_node_property failed"))?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "property.set",
        &operator_id,
    )
    .await?;

    Ok(Json(
        find_node_property(
            &state.pool,
            &tenant_id,
            &node_id,
            &property_key,
            &visibility,
        )
        .await?,
    ))
}

async fn delete_node_property(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, property_key)): Path<(String, String)>,
    Query(query): Query<DeleteNodePropertyQuery>,
) -> Result<Json<DeleteNodePropertyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let property_key = validate_node_property_key(&property_key)?.to_string();
    let visibility = validate_node_property_visibility(
        normalize_optional_text(query.visibility)
            .as_deref()
            .unwrap_or("private"),
    )?
    .to_string();
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_property
         SET lifecycle_status='deleted',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2
           AND node_id=$3
           AND property_key=$4
           AND visibility=$5
           AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&property_key)
    .bind(&visibility)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_property failed"))?
    .rows_affected();

    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "property.deleted",
            &operator_id,
        )
        .await?;
    }

    Ok(Json(DeleteNodePropertyResponse {
        deleted: affected > 0,
    }))
}

async fn list_node_labels(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeLabelListQuery>,
) -> Result<Json<NodeLabelListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let label_key = match normalize_optional_text(query.label_key) {
        Some(label_key) => Some(validate_label_key(&label_key)?.to_string()),
        None => None,
    };

    let rows = if let Some(label_key) = label_key.as_deref() {
        sqlx::query(
            "SELECT nl.id, nl.tenant_id, nl.node_id, nl.label_id,
                    nl.lifecycle_status, nl.version,
                    l.label_key, l.display_name, l.color, l.description,
                    l.lifecycle_status AS label_lifecycle_status,
                    l.version AS label_version
             FROM dr_drive_node_label nl
             INNER JOIN dr_drive_label l
                ON l.tenant_id=nl.tenant_id
               AND l.id=nl.label_id
               AND l.lifecycle_status='active'
             WHERE nl.tenant_id=$1
               AND nl.node_id=$2
               AND nl.lifecycle_status='active'
               AND l.label_key=$3
             ORDER BY l.label_key ASC
             LIMIT $4 OFFSET $5",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(label_key)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT nl.id, nl.tenant_id, nl.node_id, nl.label_id,
                    nl.lifecycle_status, nl.version,
                    l.label_key, l.display_name, l.color, l.description,
                    l.lifecycle_status AS label_lifecycle_status,
                    l.version AS label_version
             FROM dr_drive_node_label nl
             INNER JOIN dr_drive_label l
                ON l.tenant_id=nl.tenant_id
               AND l.id=nl.label_id
               AND l.lifecycle_status='active'
             WHERE nl.tenant_id=$1
               AND nl.node_id=$2
               AND nl.lifecycle_status='active'
             ORDER BY l.label_key ASC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_node_label failed"))?;
    let mut items = rows.iter().map(map_node_label_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(NodeLabelListResponse {
        items,
        next_page_token,
    }))
}

async fn apply_node_label(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, label_id)): Path<(String, String)>,
    Json(payload): Json<ApplyNodeLabelRequest>,
) -> Result<Json<NodeLabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    find_label(&state.pool, &tenant_id, &label_id).await?;
    let node_label_id = build_node_label_id(&tenant_id, &node_id, &label_id);

    sqlx::query(
        "INSERT INTO dr_drive_node_label (
            id, tenant_id, node_id, label_id, lifecycle_status,
            version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, 'active', 1, $5, $5)
         ON CONFLICT(tenant_id, node_id, label_id) DO UPDATE SET
            lifecycle_status='active',
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP,
            version=dr_drive_node_label.version + 1",
    )
    .bind(&node_label_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&label_id)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("upsert dr_drive_node_label failed"))?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "label.applied",
        &operator_id,
    )
    .await?;
    Ok(Json(
        find_node_label(&state.pool, &tenant_id, &node_id, &label_id).await?,
    ))
}

async fn remove_node_label(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, label_id)): Path<(String, String)>,
    Query(query): Query<RemoveNodeLabelQuery>,
) -> Result<Json<RemoveNodeLabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_label
         SET lifecycle_status='deleted',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2
           AND node_id=$3
           AND label_id=$4
           AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&label_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_label failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "label.removed",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(RemoveNodeLabelResponse {
        removed: affected > 0,
    }))
}

async fn update_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<UpdateNodeRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_active_node(&state.pool, &tenant_id, &node_id).await?;
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
        "node.updated",
        &operator_id,
    )
    .await?;

    Ok(Json(find_node(&state.pool, &tenant_id, &node_id).await?))
}

async fn move_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<MoveNodeRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_active_node(&state.pool, &tenant_id, &node_id).await?;
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
        "node.moved",
        &operator_id,
    )
    .await?;
    Ok(Json(find_node(&state.pool, &tenant_id, &node_id).await?))
}

async fn copy_node(
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
        "node.copied",
        &operator_id,
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(find_node(&state.pool, &tenant_id, payload.id.trim()).await?),
    ))
}

async fn delete_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<DeleteNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
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
                "node.deleted",
                &operator_id,
            )
            .await?;
        }
    }
    Ok(Json(DeleteNodeResponse {
        deleted: deleted_count > 0,
    }))
}

async fn create_node_download_url(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeDownloadUrlQuery>,
) -> Result<Json<CreateDownloadUrlResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let requested_ttl_seconds = validate_requested_ttl_seconds(
        query.requested_ttl_seconds,
        120,
        30,
        300,
        "requestedTtlSeconds",
    )?;
    let service = build_download_service(&state);
    let result = service
        .create_download_url(CreateDownloadUrlCommand {
            tenant_id,
            node_id,
            requested_ttl_seconds,
            request_base_url: state.download_public_base_url.clone(),
        })
        .await
        .map_err(map_service_error)?;
    Ok(Json(CreateDownloadUrlResponse {
        download_url: result.download_url,
        signed_source_url: result.signed_source_url,
        expires_at_epoch_ms: result.expires_at_epoch_ms,
        method: result.method,
    }))
}

async fn trash_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_node_lifecycle(state, &ctx, node_id, payload, "trashed", "node.trashed").await
}

async fn restore_trashed_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_node_lifecycle(state, &ctx, node_id, payload, "active", "node.restored").await
}

async fn list_trashed_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<NodeViewQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let parent_node_id = normalize_optional_text(query.parent_node_id);
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
        if let Some(parent_node_id) = parent_node_id.as_deref() {
            validate_target_parent(&state.pool, &tenant_id, &space_id, Some(parent_node_id))
                .await?;
            sqlx::query(&format!(
                "SELECT {NODE_API_SELECT_COLUMNS}
                 FROM dr_drive_node
                 WHERE tenant_id=$1
                   AND space_id=$2
                   AND lifecycle_status='trashed'
                   AND parent_node_id=$3
                 ORDER BY updated_at DESC, id ASC
                 LIMIT $4 OFFSET $5",
            ))
            .bind(&tenant_id)
            .bind(&space_id)
            .bind(parent_node_id)
            .bind(page.limit + 1)
            .bind(page.offset)
            .fetch_all(&state.pool)
            .await
        } else {
            sqlx::query(&format!(
                "SELECT {NODE_API_SELECT_COLUMNS}
                 FROM dr_drive_node
                 WHERE tenant_id=$1 AND space_id=$2 AND lifecycle_status='trashed'
                 ORDER BY updated_at DESC, id ASC
                 LIMIT $3 OFFSET $4",
            ))
            .bind(&tenant_id)
            .bind(&space_id)
            .bind(page.limit + 1)
            .bind(page.offset)
            .fetch_all(&state.pool)
            .await
        }
    } else if let Some(parent_node_id) = parent_node_id.as_deref() {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND lifecycle_status='trashed'
               AND parent_node_id=$2
             ORDER BY updated_at DESC, id ASC
             LIMIT $3 OFFSET $4",
        ))
        .bind(&tenant_id)
        .bind(parent_node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1 AND lifecycle_status='trashed'
             ORDER BY updated_at DESC, id ASC
             LIMIT $2 OFFSET $3",
        ))
        .bind(&tenant_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn list_recent_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<NodeViewQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND space_id=$2
               AND lifecycle_status='active'
               AND content_state='ready'
             ORDER BY updated_at DESC, id ASC
             LIMIT $3 OFFSET $4",
        ))
        .bind(&tenant_id)
        .bind(&space_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND lifecycle_status='active'
               AND content_state='ready'
             ORDER BY updated_at DESC, id ASC
             LIMIT $2 OFFSET $3",
        ))
        .bind(&tenant_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list recent dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn list_shared_with_me(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<SubjectNodeViewQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(query.subject_type, query.subject_id)?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_JOIN_COLUMNS}
             FROM dr_drive_node n
             WHERE n.tenant_id=$1
               AND n.space_id=$2
               AND n.lifecycle_status='active'
               AND n.content_state='ready'
               AND EXISTS (
                   SELECT 1
                   FROM dr_drive_node_permission p
                   WHERE p.tenant_id=n.tenant_id
                     AND p.node_id=n.id
                     AND p.lifecycle_status='active'
                     AND p.subject_type=$3
                     AND p.subject_id=$4
               )
             ORDER BY n.updated_at DESC, n.id ASC
             LIMIT $5 OFFSET $6",
        ))
        .bind(&tenant_id)
        .bind(&space_id)
        .bind(&subject_type)
        .bind(&subject_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_JOIN_COLUMNS}
             FROM dr_drive_node n
             WHERE n.tenant_id=$1
               AND n.lifecycle_status='active'
               AND n.content_state='ready'
               AND EXISTS (
                   SELECT 1
                   FROM dr_drive_node_permission p
                   WHERE p.tenant_id=n.tenant_id
                     AND p.node_id=n.id
                     AND p.lifecycle_status='active'
                     AND p.subject_type=$2
                     AND p.subject_id=$3
               )
             ORDER BY n.updated_at DESC, n.id ASC
             LIMIT $4 OFFSET $5",
        ))
        .bind(&tenant_id)
        .bind(&subject_type)
        .bind(&subject_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list shared dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn list_favorite_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<SubjectNodeViewQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(query.subject_type, query.subject_id)?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_JOIN_COLUMNS}
             FROM dr_drive_node_favorite f
             INNER JOIN dr_drive_node n
                ON n.tenant_id=f.tenant_id
               AND n.id=f.node_id
               AND n.lifecycle_status='active'
               AND n.content_state='ready'
             WHERE f.tenant_id=$1
               AND n.space_id=$2
               AND f.subject_type=$3
               AND f.subject_id=$4
               AND f.lifecycle_status='active'
             ORDER BY f.updated_at DESC, n.id ASC
             LIMIT $5 OFFSET $6",
        ))
        .bind(&tenant_id)
        .bind(&space_id)
        .bind(&subject_type)
        .bind(&subject_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_JOIN_COLUMNS}
             FROM dr_drive_node_favorite f
             INNER JOIN dr_drive_node n
                ON n.tenant_id=f.tenant_id
               AND n.id=f.node_id
               AND n.lifecycle_status='active'
               AND n.content_state='ready'
             WHERE f.tenant_id=$1
               AND f.subject_type=$2
               AND f.subject_id=$3
               AND f.lifecycle_status='active'
             ORDER BY f.updated_at DESC, n.id ASC
             LIMIT $4 OFFSET $5",
        ))
        .bind(&tenant_id)
        .bind(&subject_type)
        .bind(&subject_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list favorite dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn get_quota_summary(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
) -> Result<Json<QuotaSummaryResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let service = DriveQuotaService::new(SqlQuotaStore::new(state.pool.clone()));
    let summary = service
        .get_tenant_quota_summary(GetTenantQuotaSummaryCommand { tenant_id })
        .await
        .map_err(map_service_error)?;

    Ok(Json(QuotaSummaryResponse {
        tenant_id: summary.tenant_id,
        used_bytes: summary.total_bytes,
        object_count: summary.object_count,
    }))
}

async fn set_favorite(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<FavoriteNodeRequest>,
) -> Result<Json<FavoriteNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) =
        ctx.resolve_subject(payload.subject_type, payload.subject_id)?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    validate_subject_type(&subject_type)?;
    let favorite_id = build_favorite_id(&tenant_id, &subject_type, &subject_id, &node_id);
    sqlx::query(
        "INSERT INTO dr_drive_node_favorite (
            id, tenant_id, node_id, subject_type, subject_id,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, 'active', 1, $6, $6)
         ON CONFLICT(tenant_id, subject_type, subject_id, node_id)
         DO UPDATE SET lifecycle_status='active',
                       updated_by=excluded.updated_by,
                       updated_at=CURRENT_TIMESTAMP,
                       version=dr_drive_node_favorite.version + 1",
    )
    .bind(favorite_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&subject_type)
    .bind(&subject_id)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("upsert dr_drive_node_favorite failed"))?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "favorite.created",
        &operator_id,
    )
    .await?;
    Ok(Json(FavoriteNodeResponse { favorited: true }))
}

async fn unset_favorite(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<FavoriteNodeQuery>,
) -> Result<Json<FavoriteNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(query.subject_type, query.subject_id)?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    validate_subject_type(&subject_type)?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_favorite
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2
           AND node_id=$3
           AND subject_type=$4
           AND subject_id=$5
           AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&subject_type)
    .bind(&subject_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_favorite failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "favorite.deleted",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(FavoriteNodeResponse { favorited: false }))
}

async fn empty_trash(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<EmptyTrashRequest>,
) -> Result<Json<EmptyTrashResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let space_id = normalize_optional_text(payload.space_id);
    let trashed_rows = if let Some(space_id_value) = space_id.as_deref() {
        validate_space_exists(&state.pool, &tenant_id, space_id_value).await?;
        sqlx::query(
            "SELECT id, space_id
             FROM dr_drive_node
             WHERE tenant_id=$1 AND space_id=$2 AND lifecycle_status='trashed'
             ORDER BY updated_at ASC
             LIMIT 500",
        )
        .bind(&tenant_id)
        .bind(space_id_value)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, space_id
             FROM dr_drive_node
             WHERE tenant_id=$1 AND lifecycle_status='trashed'
             ORDER BY updated_at ASC
             LIMIT 500",
        )
        .bind(&tenant_id)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;

    let node_ids = trashed_rows
        .iter()
        .map(|row| row.get::<String, _>("id"))
        .collect::<Vec<_>>();
    for node_id in &node_ids {
        sqlx::query(
            "UPDATE dr_drive_node
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$2 AND id=$3 AND lifecycle_status='trashed'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(node_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("empty trash dr_drive_node failed"))?;

        sqlx::query(
            "UPDATE dr_drive_storage_object
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(node_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error(
            "empty trash dr_drive_storage_object metadata failed",
        ))?;
    }

    let mut changed_spaces = Vec::<String>::new();
    for row in &trashed_rows {
        let space_id_value: String = row.get("space_id");
        if !changed_spaces.contains(&space_id_value) {
            changed_spaces.push(space_id_value);
        }
    }
    for space_id_value in changed_spaces {
        record_change(
            &state.pool,
            &tenant_id,
            &space_id_value,
            None,
            "trash.emptied",
            &operator_id,
        )
        .await?;
    }

    Ok(Json(EmptyTrashResponse {
        deleted_count: node_ids.len() as i64,
    }))
}

async fn list_versions(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<VersionListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let logical_version_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_node_version
         WHERE tenant_id=$1 AND node_id=$2",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error(
        "count dr_drive_node_version rows failed",
    ))?;
    let rows = if logical_version_count > 0 {
        sqlx::query(
            "SELECT id, tenant_id, node_id, version_no, storage_object_id, content_type, content_length,
                    checksum_sha256_hex, lifecycle_status, created_at
             FROM dr_drive_node_version
             WHERE tenant_id=$1 AND node_id=$2
             ORDER BY version_no DESC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
        .map_err(internal_sql_error(
            "list dr_drive_node_version rows failed",
        ))?
    } else {
        sqlx::query(
            "SELECT id, tenant_id, node_id, version_no, NULL AS storage_object_id, content_type, content_length,
                    checksum_sha256_hex, lifecycle_status, created_at
             FROM dr_drive_storage_object
             WHERE tenant_id=$1 AND node_id=$2
             ORDER BY version_no DESC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
        .map_err(internal_sql_error(
            "list dr_drive_storage_object versions failed",
        ))?
    };
    let mut items = rows.iter().map(map_file_version_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(VersionListResponse {
        items,
        next_page_token,
    }))
}

async fn get_version(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, version_id)): Path<(String, String)>,
) -> Result<Json<FileVersionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let logical_row = sqlx::query(
        "SELECT id, tenant_id, node_id, version_no, storage_object_id, content_type, content_length,
                checksum_sha256_hex, lifecycle_status, created_at
         FROM dr_drive_node_version
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_version failed"))?;
    if let Some(row) = logical_row {
        return Ok(Json(map_file_version_row(&row)));
    }
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, version_no, NULL AS storage_object_id, content_type, content_length,
                checksum_sha256_hex, lifecycle_status, created_at
         FROM dr_drive_storage_object
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error(
        "read dr_drive_storage_object version failed",
    ))?;
    let Some(row) = row else {
        return Err(not_found_problem("version not found"));
    };
    Ok(Json(map_file_version_row(&row)))
}

async fn restore_version(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, version_id)): Path<(String, String)>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let logical_row = sqlx::query(
        "SELECT storage_object_id
         FROM dr_drive_node_version
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error(
        "find dr_drive_node_version restore target failed",
    ))?;
    if let Some(row) = logical_row {
        let storage_object_id: Option<String> = row.get("storage_object_id");
        let affected = sqlx::query(
            "UPDATE dr_drive_node_version
             SET lifecycle_status='active', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND id=$4",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(&version_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("restore dr_drive_node_version failed"))?
        .rows_affected();
        if affected == 0 {
            return Err(not_found_problem("version not found"));
        }
        if let Some(storage_object_id) = storage_object_id {
            sqlx::query(
                "UPDATE dr_drive_storage_object
                 SET lifecycle_status='active', updated_by=$1, updated_at=CURRENT_TIMESTAMP
                 WHERE tenant_id=$2 AND node_id=$3 AND id=$4",
            )
            .bind(&operator_id)
            .bind(&tenant_id)
            .bind(&node_id)
            .bind(&storage_object_id)
            .execute(&state.pool)
            .await
            .map_err(internal_sql_error(
                "restore dr_drive_storage_object from node version failed",
            ))?;
        }
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "version.restored",
            &operator_id,
        )
        .await?;
        return Ok(Json(node));
    }
    let affected = sqlx::query(
        "UPDATE dr_drive_storage_object
         SET lifecycle_status='active', updated_by=$1, updated_at=CURRENT_TIMESTAMP
         WHERE tenant_id=$2 AND node_id=$3 AND id=$4",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error(
        "restore dr_drive_storage_object version failed",
    ))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("version not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "version.restored",
        &operator_id,
    )
    .await?;
    Ok(Json(node))
}

async fn delete_version(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, version_id)): Path<(String, String)>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<DeleteVersionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let logical_row = sqlx::query(
        "SELECT lifecycle_status, storage_object_id
         FROM dr_drive_node_version
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_version failed"))?;
    if let Some(row) = logical_row {
        let current_status: String = row.get("lifecycle_status");
        let storage_object_id: Option<String> = row.get("storage_object_id");
        if current_status == "active" {
            let active_version_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(1)
                 FROM dr_drive_node_version
                 WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'",
            )
            .bind(&tenant_id)
            .bind(&node_id)
            .fetch_one(&state.pool)
            .await
            .map_err(internal_sql_error(
                "count active dr_drive_node_version rows failed",
            ))?;
            if active_version_count <= 1 {
                return Err(problem(
                    StatusCode::CONFLICT,
                    "conflict",
                    "cannot delete the only active version",
                    "drive.conflict",
                ));
            }
        }
        let affected = sqlx::query(
            "UPDATE dr_drive_node_version
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(&version_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("delete dr_drive_node_version failed"))?
        .rows_affected();
        if let Some(storage_object_id) = storage_object_id.filter(|_| affected > 0) {
            sqlx::query(
                "UPDATE dr_drive_storage_object
                 SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
                 WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status != 'deleted'",
            )
            .bind(&operator_id)
            .bind(&tenant_id)
            .bind(&node_id)
            .bind(&storage_object_id)
            .execute(&state.pool)
            .await
            .map_err(internal_sql_error(
                "delete dr_drive_storage_object from node version failed",
            ))?;
        }
        if affected > 0 {
            record_change(
                &state.pool,
                &tenant_id,
                &node.space_id,
                Some(&node_id),
                "version.deleted",
                &operator_id,
            )
            .await?;
        }
        return Ok(Json(DeleteVersionResponse {
            deleted: affected > 0,
        }));
    }
    let current_status: Option<String> = sqlx::query_scalar(
        "SELECT lifecycle_status
         FROM dr_drive_storage_object
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error(
        "find dr_drive_storage_object version failed",
    ))?;
    let Some(current_status) = current_status else {
        return Err(not_found_problem("version not found"));
    };
    if current_status == "active" {
        let active_version_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM dr_drive_storage_object
             WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .fetch_one(&state.pool)
        .await
        .map_err(internal_sql_error(
            "count active dr_drive_storage_object versions failed",
        ))?;
        if active_version_count <= 1 {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "cannot delete the only active version",
                "drive.conflict",
            ));
        }
    }

    let affected = sqlx::query(
        "UPDATE dr_drive_storage_object
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
         WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&version_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error(
        "delete dr_drive_storage_object version failed",
    ))?
    .rows_affected();
    if affected == 0 && current_status != "deleted" {
        return Err(not_found_problem("version not found"));
    }
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "version.deleted",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(DeleteVersionResponse {
        deleted: affected > 0,
    }))
}

async fn list_permissions(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<PermissionListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let rows = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
         ORDER BY subject_type ASC, subject_id ASC
         LIMIT $3 OFFSET $4",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_node_permission failed"))?;
    let mut items = rows.iter().map(map_permission_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(PermissionListResponse {
        items,
        next_page_token,
    }))
}

async fn get_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("permission not found"));
    };
    Ok(Json(map_permission_row(&row)))
}

async fn list_effective_permissions(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<EffectivePermissionListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let node_path = resolve_node_path(&state.pool, &tenant_id, &node_id).await?;
    let mut items = Vec::<EffectivePermissionResponse>::new();
    let mut seen_principals = std::collections::BTreeSet::<(String, String)>::new();

    for node in node_path.iter().rev() {
        let rows = sqlx::query(
            "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
             FROM dr_drive_node_permission
             WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
             ORDER BY subject_type ASC, subject_id ASC, id ASC",
        )
        .bind(&tenant_id)
        .bind(&node.id)
        .fetch_all(&state.pool)
        .await
        .map_err(internal_sql_error("list effective dr_drive_node_permission failed"))?;

        for row in rows {
            let permission = map_permission_row(&row);
            let principal_key = (
                permission.subject_type.clone(),
                permission.subject_id.clone(),
            );
            if !seen_principals.insert(principal_key) {
                continue;
            }
            let inherited = permission.node_id != node_id;
            items.push(EffectivePermissionResponse {
                id: permission.id,
                tenant_id: permission.tenant_id,
                target_node_id: node_id.clone(),
                node_id: permission.node_id.clone(),
                subject_type: permission.subject_type,
                subject_id: permission.subject_id,
                role: permission.role,
                inherited,
                inherited_from_node_id: inherited.then_some(permission.node_id),
                lifecycle_status: permission.lifecycle_status,
                version: permission.version,
            });
        }
    }

    let mut page_items = items
        .into_iter()
        .skip(page.offset as usize)
        .take((page.limit + 1) as usize)
        .collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut page_items, page);

    Ok(Json(EffectivePermissionListResponse {
        items: page_items,
        next_page_token,
    }))
}

async fn create_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CreatePermissionRequest>,
) -> Result<(StatusCode, Json<PermissionResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    validate_subject_type(&payload.subject_type)?;
    validate_permission_role(&payload.role)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    sqlx::query(
        "INSERT INTO dr_drive_node_permission (
            id, tenant_id, node_id, subject_type, subject_id, role,
            inherited, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', 1, $7, $7)",
    )
    .bind(&payload.id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&payload.subject_type)
    .bind(&payload.subject_id)
    .bind(&payload.role)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "permission already exists for node subject",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert dr_drive_node_permission failed: {error}"))
    })?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "permission.created",
        &operator_id,
    )
    .await?;

    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(&tenant_id)
    .bind(&payload.id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;

    Ok((StatusCode::CREATED, Json(map_permission_row(&row))))
}

async fn update_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
    Json(payload): Json<UpdatePermissionRequest>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let current_row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_permission failed"))?;
    let Some(current_row) = current_row else {
        return Err(not_found_problem("permission not found"));
    };
    let current = map_permission_row(&current_row);
    let role = payload
        .role
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or(current.role);
    validate_permission_role(&role)?;

    let affected = sqlx::query(
        "UPDATE dr_drive_node_permission
         SET role=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$3 AND node_id=$4 AND id=$5 AND lifecycle_status='active'",
    )
    .bind(&role)
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node_permission failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("permission not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "permission.updated",
        &operator_id,
    )
    .await?;

    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;

    Ok(Json(map_permission_row(&row)))
}

async fn delete_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_permission
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_permission failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "permission.deleted",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(json!({ "deleted": affected > 0 })))
}

async fn list_share_links(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<ShareLinkListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let rows = sqlx::query(
        "SELECT id, tenant_id, node_id, role, expires_at_epoch_ms, download_limit,
                download_count, lifecycle_status, version
         FROM dr_drive_node_share_link
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_node_share_link failed"))?;
    let mut items = rows.iter().map(map_share_link_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(ShareLinkListResponse {
        items,
        next_page_token,
    }))
}

async fn get_share_link(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(share_link_id): Path<String>,
) -> Result<Json<ShareLinkResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let current = find_share_link(&state.pool, &tenant_id, &share_link_id).await?;
    find_node(&state.pool, &tenant_id, &current.node_id).await?;
    Ok(Json(ShareLinkResponse::from(current)))
}

async fn create_share_link(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CreateShareLinkRequest>,
) -> Result<(StatusCode, Json<ShareLinkResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let token_hash = drive_share_token_hash(&payload.token);
    let role = payload
        .role
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "reader".to_string());
    validate_share_link_role(&role)?;
    validate_optional_future_epoch_ms(payload.expires_at_epoch_ms, "expiresAtEpochMs")?;
    validate_optional_non_negative_i64(payload.download_limit, "downloadLimit")?;
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms, download_limit,
            download_count, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'active', 1, $8, $8)",
    )
    .bind(&payload.id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(token_hash)
    .bind(role)
    .bind(payload.expires_at_epoch_ms)
    .bind(payload.download_limit)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "share token already exists",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert dr_drive_node_share_link failed: {error}"))
    })?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "share_link.created",
        &operator_id,
    )
    .await?;

    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, role, expires_at_epoch_ms, download_limit,
                download_count, lifecycle_status, version
         FROM dr_drive_node_share_link
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(&tenant_id)
    .bind(&payload.id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_share_link failed"))?;
    Ok((StatusCode::CREATED, Json(map_share_link_row(&row))))
}

async fn update_share_link(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(share_link_id): Path<String>,
    Json(payload): Json<UpdateShareLinkRequest>,
) -> Result<Json<ShareLinkResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_share_link(&state.pool, &tenant_id, &share_link_id).await?;
    let node = find_active_node(&state.pool, &tenant_id, &current.node_id).await?;
    let role = payload
        .role
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or(current.role.clone());
    validate_share_link_role(&role)?;
    let expires_at_epoch_ms =
        apply_optional_i64_patch(payload.expires_at_epoch_ms, current.expires_at_epoch_ms);
    let download_limit = apply_optional_i64_patch(payload.download_limit, current.download_limit);
    validate_optional_future_epoch_ms(expires_at_epoch_ms, "expiresAtEpochMs")?;
    validate_optional_non_negative_i64(download_limit, "downloadLimit")?;

    let affected = sqlx::query(
        "UPDATE dr_drive_node_share_link
         SET role=$1, expires_at_epoch_ms=$2, download_limit=$3,
             updated_by=$4, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$5 AND id=$6 AND lifecycle_status='active'",
    )
    .bind(&role)
    .bind(expires_at_epoch_ms)
    .bind(download_limit)
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&share_link_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node_share_link failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("share link not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&current.node_id),
        "share_link.updated",
        &operator_id,
    )
    .await?;

    let updated = find_share_link(&state.pool, &tenant_id, &share_link_id).await?;
    Ok(Json(ShareLinkResponse::from(updated)))
}

async fn revoke_share_link(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(share_link_id): Path<String>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let current = find_share_link(&state.pool, &tenant_id, &share_link_id).await?;
    let node = find_active_node(&state.pool, &tenant_id, &current.node_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_share_link
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&share_link_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("revoke dr_drive_node_share_link failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&current.node_id),
            "share_link.revoked",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(json!({ "revoked": affected > 0 })))
}

async fn list_comments(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<CommentListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let rows = sqlx::query(
        "SELECT id, tenant_id, node_id, content, anchor, resolved, lifecycle_status,
                version, created_by, updated_by, created_at, updated_at
         FROM dr_drive_node_comment
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
         ORDER BY created_at DESC, id DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_node_comment failed"))?;
    let mut items = rows
        .iter()
        .map(map_comment_row)
        .map(CommentResponse::from)
        .collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(CommentListResponse {
        items,
        next_page_token,
    }))
}

async fn get_comment(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id)): Path<(String, String)>,
) -> Result<Json<CommentResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    let comment = find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    Ok(Json(CommentResponse::from(comment)))
}

async fn create_comment(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<(StatusCode, Json<CommentResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    let comment_id = require_non_empty_text(payload.id, "id")?;
    let content = require_non_empty_text(payload.content, "content")?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let anchor = normalize_optional_text(payload.anchor);

    sqlx::query(
        "INSERT INTO dr_drive_node_comment (
            id, tenant_id, node_id, content, anchor, resolved, lifecycle_status,
            version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, 0, 'active', 1, $6, $6)",
    )
    .bind(&comment_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&content)
    .bind(anchor.as_deref())
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("insert dr_drive_node_comment failed"))?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "comment.created",
        &operator_id,
    )
    .await?;

    let comment = find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    Ok((StatusCode::CREATED, Json(CommentResponse::from(comment))))
}

async fn update_comment(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id)): Path<(String, String)>,
    Json(payload): Json<UpdateCommentRequest>,
) -> Result<Json<CommentResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = payload
        .operator_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "operator-unset".to_string());
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let current = find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    let content = match payload.content {
        Some(value) => require_non_empty_text(value, "content")?,
        None => current.content,
    };
    let anchor = payload
        .anchor
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or(current.anchor);
    let resolved = payload.resolved.unwrap_or(current.resolved);

    let affected = sqlx::query(
        "UPDATE dr_drive_node_comment
         SET content=$1, anchor=$2, resolved=$3, updated_by=$4,
             updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$5 AND node_id=$6 AND id=$7 AND lifecycle_status='active'",
    )
    .bind(&content)
    .bind(anchor.as_deref())
    .bind(if resolved { 1_i64 } else { 0_i64 })
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node_comment failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("comment not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "comment.updated",
        &operator_id,
    )
    .await?;

    let comment = find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    Ok(Json(CommentResponse::from(comment)))
}

async fn delete_comment(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id)): Path<(String, String)>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = query
        .operator_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "operator-unset".to_string());
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_comment
         SET lifecycle_status='deleted', updated_by=$1,
             updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_comment failed"))?
    .rows_affected();
    if affected > 0 {
        sqlx::query(
            "UPDATE dr_drive_node_comment_reply
             SET lifecycle_status='deleted', updated_by=$1,
                 updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$2 AND node_id=$3 AND comment_id=$4 AND lifecycle_status='active'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(&comment_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error(
            "delete dr_drive_node_comment_reply cascade failed",
        ))?;
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "comment.deleted",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(json!({ "deleted": affected > 0 })))
}

async fn list_comment_replies(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id)): Path<(String, String)>,
    Query(query): Query<PageQuery>,
) -> Result<Json<CommentReplyListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    let rows = sqlx::query(
        "SELECT id, tenant_id, node_id, comment_id, content, lifecycle_status,
                version, created_by, updated_by, created_at, updated_at
         FROM dr_drive_node_comment_reply
         WHERE tenant_id=$1 AND node_id=$2 AND comment_id=$3 AND lifecycle_status='active'
         ORDER BY created_at ASC, id ASC
         LIMIT $4 OFFSET $5",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error(
        "list dr_drive_node_comment_reply failed",
    ))?;
    let mut items = rows
        .iter()
        .map(map_comment_reply_row)
        .map(CommentReplyResponse::from)
        .collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(CommentReplyListResponse {
        items,
        next_page_token,
    }))
}

async fn get_comment_reply(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id, reply_id)): Path<(String, String, String)>,
) -> Result<Json<CommentReplyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    find_node(&state.pool, &tenant_id, &node_id).await?;
    find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    let reply =
        find_comment_reply(&state.pool, &tenant_id, &node_id, &comment_id, &reply_id).await?;
    Ok(Json(CommentReplyResponse::from(reply)))
}

async fn create_comment_reply(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id)): Path<(String, String)>,
    Json(payload): Json<CreateCommentReplyRequest>,
) -> Result<(StatusCode, Json<CommentReplyResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    let reply_id = require_non_empty_text(payload.id, "id")?;
    let content = require_non_empty_text(payload.content, "content")?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;

    sqlx::query(
        "INSERT INTO dr_drive_node_comment_reply (
            id, tenant_id, node_id, comment_id, content, lifecycle_status,
            version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, 'active', 1, $6, $6)",
    )
    .bind(&reply_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .bind(&content)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error(
        "insert dr_drive_node_comment_reply failed",
    ))?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "comment_reply.created",
        &operator_id,
    )
    .await?;
    let reply =
        find_comment_reply(&state.pool, &tenant_id, &node_id, &comment_id, &reply_id).await?;
    Ok((StatusCode::CREATED, Json(CommentReplyResponse::from(reply))))
}

async fn update_comment_reply(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id, reply_id)): Path<(String, String, String)>,
    Json(payload): Json<UpdateCommentReplyRequest>,
) -> Result<Json<CommentReplyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = payload
        .operator_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "operator-unset".to_string());
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    let current =
        find_comment_reply(&state.pool, &tenant_id, &node_id, &comment_id, &reply_id).await?;
    let content = match payload.content {
        Some(value) => require_non_empty_text(value, "content")?,
        None => current.content,
    };

    let affected = sqlx::query(
        "UPDATE dr_drive_node_comment_reply
         SET content=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$3 AND node_id=$4 AND comment_id=$5 AND id=$6 AND lifecycle_status='active'",
    )
    .bind(&content)
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .bind(&reply_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node_comment_reply failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("comment reply not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "comment_reply.updated",
        &operator_id,
    )
    .await?;
    let reply =
        find_comment_reply(&state.pool, &tenant_id, &node_id, &comment_id, &reply_id).await?;
    Ok(Json(CommentReplyResponse::from(reply)))
}

async fn delete_comment_reply(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, comment_id, reply_id)): Path<(String, String, String)>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = query
        .operator_id
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "operator-unset".to_string());
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    find_comment(&state.pool, &tenant_id, &node_id, &comment_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_comment_reply
         SET lifecycle_status='deleted', updated_by=$1,
             updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND node_id=$3 AND comment_id=$4 AND id=$5 AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&comment_id)
    .bind(&reply_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_comment_reply failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            "comment_reply.deleted",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(json!({ "deleted": affected > 0 })))
}

async fn search_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let needle = format!("%{}%", query.q.unwrap_or_default().trim());
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND space_id=$2
               AND node_name LIKE $3
               AND lifecycle_status='active'
               AND content_state='ready'
             ORDER BY updated_at DESC, id ASC
             LIMIT $4 OFFSET $5",
        ))
        .bind(&tenant_id)
        .bind(&space_id)
        .bind(needle)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(&format!(
            "SELECT {NODE_API_SELECT_COLUMNS}
             FROM dr_drive_node
             WHERE tenant_id=$1
               AND node_name LIKE $2
               AND lifecycle_status='active'
               AND content_state='ready'
             ORDER BY updated_at DESC, id ASC
             LIMIT $3 OFFSET $4",
        ))
        .bind(&tenant_id)
        .bind(needle)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("search dr_drive_node failed"))?;
    let mut items = rows.iter().map(map_node_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(NodeListResponse {
        items,
        next_page_token,
    }))
}

async fn list_changes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<ChangesQuery>,
) -> Result<Json<ChangeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_change_page_request(query.page_size, query.page_token, query.cursor)?;
    let rows = if let Some(space_id) = normalize_optional_text(query.space_id) {
        validate_space_exists_for_change_history(&state.pool, &tenant_id, &space_id).await?;
        sqlx::query(
            "SELECT sequence_no, tenant_id, space_id, node_id, event_type, actor_id, created_at
             FROM dr_drive_change_log
             WHERE tenant_id=$1 AND space_id=$2 AND sequence_no > $3
             ORDER BY sequence_no ASC
             LIMIT $4",
        )
        .bind(&tenant_id)
        .bind(&space_id)
        .bind(page.offset)
        .bind(page.limit + 1)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT sequence_no, tenant_id, space_id, node_id, event_type, actor_id, created_at
             FROM dr_drive_change_log
             WHERE tenant_id=$1 AND sequence_no > $2
             ORDER BY sequence_no ASC
             LIMIT $3",
        )
        .bind(&tenant_id)
        .bind(page.offset)
        .bind(page.limit + 1)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_change_log failed"))?;

    let mut items = rows
        .iter()
        .map(|row| ChangeResponse {
            sequence_no: row.get("sequence_no"),
            tenant_id: row.get("tenant_id"),
            space_id: row.get("space_id"),
            node_id: row.get("node_id"),
            event_type: row.get("event_type"),
            actor_id: row.get("actor_id"),
            created_at: row.get("created_at"),
        })
        .collect::<Vec<_>>();
    let next_page_token = next_change_page_token(&mut items, page);
    let next_cursor = items.last().map(|item| item.sequence_no);
    Ok(Json(ChangeListResponse {
        items,
        next_cursor,
        next_page_token,
    }))
}

async fn get_changes_start_page_token(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<StartPageTokenQuery>,
) -> Result<Json<StartPageTokenResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let space_id = normalize_optional_text(query.space_id);
    let start_page_token = if let Some(space_id) = space_id.as_deref() {
        validate_space_exists(&state.pool, &tenant_id, space_id).await?;
        query_start_page_token(&state.pool, &tenant_id, Some(space_id)).await?
    } else {
        query_start_page_token(&state.pool, &tenant_id, None).await?
    };
    Ok(Json(StartPageTokenResponse {
        start_page_token: start_page_token.to_string(),
    }))
}

async fn watch_changes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateWatchChannelRequest>,
) -> Result<(StatusCode, Json<DriveWatchChannelResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let space_id = require_body_value(payload.space_id, "spaceId")?;
    validate_space_exists(&state.pool, &tenant_id, &space_id).await?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let channel_id = validate_watch_channel_id(&payload.id)?.to_string();
    let address = validate_watch_channel_address(&payload.address)?.to_string();
    let channel_type = validate_watch_channel_type(
        normalize_optional_text(payload.channel_type)
            .as_deref()
            .unwrap_or("web_hook"),
    )?
    .to_string();
    validate_watch_expiration(payload.expiration_epoch_ms)?;
    insert_watch_channel(
        &state.pool,
        InsertWatchChannel {
            id: &channel_id,
            tenant_id: &tenant_id,
            space_id: Some(&space_id),
            node_id: None,
            resource_type: "changes",
            resource_id: Some(&space_id),
            channel_type: &channel_type,
            address: &address,
            token_hash: payload.token.as_deref().map(hash_watch_token),
            expiration_epoch_ms: payload.expiration_epoch_ms,
            operator_id: &operator_id,
        },
    )
    .await?;
    record_change(
        &state.pool,
        &tenant_id,
        &space_id,
        None,
        "watch_channel.created",
        &operator_id,
    )
    .await?;
    Ok((
        StatusCode::CREATED,
        Json(find_watch_channel(&state.pool, &tenant_id, &channel_id).await?),
    ))
}

async fn watch_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CreateWatchChannelRequest>,
) -> Result<(StatusCode, Json<DriveWatchChannelResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let channel_id = validate_watch_channel_id(&payload.id)?.to_string();
    let address = validate_watch_channel_address(&payload.address)?.to_string();
    let channel_type = validate_watch_channel_type(
        normalize_optional_text(payload.channel_type)
            .as_deref()
            .unwrap_or("web_hook"),
    )?
    .to_string();
    validate_watch_expiration(payload.expiration_epoch_ms)?;
    insert_watch_channel(
        &state.pool,
        InsertWatchChannel {
            id: &channel_id,
            tenant_id: &tenant_id,
            space_id: Some(&node.space_id),
            node_id: Some(&node_id),
            resource_type: "node",
            resource_id: Some(&node_id),
            channel_type: &channel_type,
            address: &address,
            token_hash: payload.token.as_deref().map(hash_watch_token),
            expiration_epoch_ms: payload.expiration_epoch_ms,
            operator_id: &operator_id,
        },
    )
    .await?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        "watch_channel.created",
        &operator_id,
    )
    .await?;
    Ok((
        StatusCode::CREATED,
        Json(find_watch_channel(&state.pool, &tenant_id, &channel_id).await?),
    ))
}

async fn list_watch_channels(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<WatchChannelListQuery>,
) -> Result<Json<WatchChannelListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let lifecycle_status = validate_watch_lifecycle_status(
        normalize_optional_text(query.lifecycle_status)
            .as_deref()
            .unwrap_or("active"),
    )?
    .to_string();
    let resource_type = match normalize_optional_text(query.resource_type) {
        Some(resource_type) => Some(validate_watch_resource_type(&resource_type)?.to_string()),
        None => None,
    };

    let rows = if let Some(resource_type) = resource_type.as_deref() {
        sqlx::query(
            "SELECT id, tenant_id, space_id, node_id, resource_type, resource_id,
                    channel_type, address, expiration_epoch_ms, lifecycle_status, version
             FROM dr_drive_watch_channel
             WHERE tenant_id=$1
               AND lifecycle_status=$2
               AND resource_type=$3
             ORDER BY created_at ASC, id ASC
             LIMIT $4 OFFSET $5",
        )
        .bind(&tenant_id)
        .bind(&lifecycle_status)
        .bind(resource_type)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, tenant_id, space_id, node_id, resource_type, resource_id,
                    channel_type, address, expiration_epoch_ms, lifecycle_status, version
             FROM dr_drive_watch_channel
             WHERE tenant_id=$1
               AND lifecycle_status=$2
             ORDER BY created_at ASC, id ASC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&lifecycle_status)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_watch_channel failed"))?;
    let mut items = rows.iter().map(map_watch_channel_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(WatchChannelListResponse {
        items,
        next_page_token,
    }))
}

async fn get_watch_channel(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(channel_id): Path<String>,
) -> Result<Json<DriveWatchChannelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    Ok(Json(
        find_watch_channel(&state.pool, &tenant_id, &channel_id).await?,
    ))
}

async fn stop_watch_channel(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(channel_id): Path<String>,
    Json(payload): Json<StopWatchChannelRequest>,
) -> Result<Json<StopWatchChannelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let current = find_watch_channel(&state.pool, &tenant_id, &channel_id).await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_watch_channel
         SET lifecycle_status='stopped',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2
           AND id=$3
           AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&channel_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("stop dr_drive_watch_channel failed"))?
    .rows_affected();
    if affected > 0 {
        let space_id = current.space_id.as_deref().unwrap_or(&channel_id);
        record_change(
            &state.pool,
            &tenant_id,
            space_id,
            current.node_id.as_deref(),
            "watch_channel.stopped",
            &operator_id,
        )
        .await?;
    }
    Ok(Json(StopWatchChannelResponse {
        stopped: affected > 0,
        channel: find_watch_channel(&state.pool, &tenant_id, &channel_id).await?,
    }))
}

async fn presign_upload_part(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((upload_session_id, part_no)): Path<(String, u16)>,
    Json(payload): Json<PresignUploadPartRequest>,
) -> Result<Json<PresignedUploadPartResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    if part_no == 0 || part_no > 10_000 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "partNo must be between 1 and 10000",
            "drive.validation.failed",
        ));
    }
    let upload_session = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    validate_mutable_upload_session(&upload_session)?;
    if let Some(upload_id) = payload.upload_id.as_deref() {
        let upload_id = upload_id.trim();
        if upload_id.is_empty() {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "uploadId must not be empty",
                "drive.validation.failed",
            ));
        }
        if upload_id != upload_session.storage_upload_id {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "uploadId does not match upload session storage upload id",
                "drive.conflict",
            ));
        }
    }
    find_active_node(&state.pool, &tenant_id, &upload_session.node_id).await?;
    let upload_id = upload_session.storage_upload_id.clone();
    let requested_ttl_seconds = validate_requested_ttl_seconds(
        payload.requested_ttl_seconds,
        120,
        30,
        300,
        "requestedTtlSeconds",
    )?;
    let expires_at_epoch_ms = current_epoch_ms() + i64::from(requested_ttl_seconds) * 1000;
    let signed = AppDownloadSigner::new(state.pool.clone())
        .sign_upload_part(UploadPartSignCommand {
            storage_provider_id: upload_session.storage_provider_id.clone(),
            bucket: upload_session.bucket.clone(),
            object_key: upload_session.object_key.clone(),
            upload_id: upload_id.clone(),
            part_no,
            expires_at_epoch_ms,
        })
        .await
        .map_err(map_service_error)?;

    update_upload_session_state(
        &state.pool,
        &tenant_id,
        &upload_session_id,
        "uploading",
        "operator-unset",
    )
    .await?;

    Ok(Json(PresignedUploadPartResponse {
        upload_url: signed.raw_url,
        expires_at_epoch_ms: signed.expires_at_epoch_ms,
        method: signed.method,
        headers: signed.headers,
        part_no,
        upload_id,
    }))
}

async fn complete_upload_session(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(upload_session_id): Path<String>,
    Json(payload): Json<CompleteUploadSessionRequest>,
) -> Result<Json<UploadSessionMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    validate_completed_multipart_parts(&payload.parts)?;
    let content_type = validate_content_type(&payload.content_type, "contentType")?;
    let checksum_sha256_hex =
        validate_sha256_checksum(&payload.checksum_sha256_hex, "checksumSha256Hex")?;
    let content_length = payload.content_length.into_i64();
    if content_length < 0 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "contentLength must be greater than or equal to 0",
            "drive.validation.failed",
        ));
    }

    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let upload_session = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    validate_mutable_upload_session(&upload_session)?;
    if let Some(upload_id) = payload.upload_id.as_deref() {
        let upload_id = upload_id.trim();
        if upload_id.is_empty() {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "uploadId must not be empty",
                "drive.validation.failed",
            ));
        }
        if upload_id != upload_session.storage_upload_id {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "uploadId does not match upload session storage upload id",
                "drive.conflict",
            ));
        }
    }
    let node = find_active_node(&state.pool, &tenant_id, &upload_session.node_id).await?;
    let node_content_state_before_completion =
        read_node_content_state(&state.pool, &tenant_id, &upload_session.node_id).await?;
    let uploader_upload_item =
        find_uploader_upload_item_by_session(&state.pool, &tenant_id, &upload_session_id).await?;
    let completed_object_plan =
        plan_completed_storage_object_insert(&state.pool, &tenant_id, &upload_session).await?;
    claim_upload_session_completion(&state.pool, &upload_session, &operator_id).await?;
    if let Err(error) =
        complete_storage_multipart_upload(&state, &upload_session, &payload.parts).await
    {
        let _ = update_upload_session_state(
            &state.pool,
            &tenant_id,
            &upload_session_id,
            "uploading",
            &operator_id,
        )
        .await;
        return Err(error);
    }

    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            scene, source, content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $13)",
    )
    .bind(&completed_object_plan.id)
    .bind(&tenant_id)
    .bind(&upload_session.node_id)
    .bind(completed_object_plan.version_no)
    .bind(&upload_session.storage_provider_id)
    .bind(&upload_session.bucket)
    .bind(&upload_session.object_key)
    .bind(
        uploader_upload_item
            .as_ref()
            .and_then(|item| item.scene.as_deref()),
    )
    .bind(
        uploader_upload_item
            .as_ref()
            .and_then(|item| item.source.as_deref()),
    )
    .bind(content_type)
    .bind(content_length)
    .bind(checksum_sha256_hex)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("insert dr_drive_storage_object failed"))?;

    insert_node_version_for_storage_object(
        &state.pool,
        NodeVersionStorageMetadata {
            tenant_id: &tenant_id,
            space_id: &node.space_id,
            node_id: &upload_session.node_id,
            version_no: completed_object_plan.version_no,
            storage_object_id: &completed_object_plan.id,
            content_type,
            content_length,
            checksum_sha256_hex,
        },
        uploader_upload_item.as_ref(),
        &operator_id,
    )
    .await?;

    if let Some(upload_item) = uploader_upload_item.as_ref() {
        complete_uploader_upload_item(
            &state.pool,
            CompletedUploaderUploadItem {
                tenant_id: &tenant_id,
                upload_item,
                storage_object: &completed_object_plan,
                upload_session: &upload_session,
                content_type,
                content_length,
                checksum_sha256_hex,
                uploaded_parts_count: payload.parts.len() as i64,
                operator_id: &operator_id,
                before_content_state: &node_content_state_before_completion,
            },
        )
        .await?;
    }

    update_upload_session_state(
        &state.pool,
        &tenant_id,
        &upload_session_id,
        "completed",
        &operator_id,
    )
    .await?;
    let head_snapshot = if let Some(upload_item) = uploader_upload_item.as_ref() {
        FileNodeHeadSnapshot {
            file_extension: upload_item.file_extension.clone(),
            content_type: content_type.to_string(),
            content_type_group: upload_item.content_type_group.clone(),
            content_length,
            version_no: completed_object_plan.version_no,
            checksum_sha256_hex: checksum_sha256_hex.to_string(),
        }
    } else {
        FileNodeHeadSnapshot {
            file_extension: None,
            content_type: content_type.to_string(),
            content_type_group: content_type_group_for(content_type).to_string(),
            content_length,
            version_no: completed_object_plan.version_no,
            checksum_sha256_hex: checksum_sha256_hex.to_string(),
        }
    };
    apply_file_node_head_snapshot(
        &state.pool,
        &tenant_id,
        &upload_session.node_id,
        &operator_id,
        &head_snapshot,
    )
    .await
    .map_err(map_service_error)?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&upload_session.node_id),
        "upload.completed",
        &operator_id,
    )
    .await?;

    let updated = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    Ok(Json(UploadSessionMutationResponse::from(updated)))
}

async fn abort_upload_session(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(upload_session_id): Path<String>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<UploadSessionMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let upload_session = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    validate_mutable_upload_session(&upload_session)?;
    let node = find_active_node(&state.pool, &tenant_id, &upload_session.node_id).await?;
    abort_storage_multipart_upload(&state, &upload_session).await?;
    update_upload_session_state(
        &state.pool,
        &tenant_id,
        &upload_session_id,
        "aborted",
        &operator_id,
    )
    .await?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&upload_session.node_id),
        "upload.aborted",
        &operator_id,
    )
    .await?;
    let updated = find_upload_session(&state.pool, &tenant_id, &upload_session_id).await?;
    Ok(Json(UploadSessionMutationResponse::from(updated)))
}

async fn create_download_url(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<CreateDownloadUrlRequest>,
) -> Result<(StatusCode, Json<CreateDownloadUrlResponse>), (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let service = build_download_service(&state);
    let requested_ttl_seconds = validate_requested_ttl_seconds(
        payload.requested_ttl_seconds,
        120,
        30,
        300,
        "requestedTtlSeconds",
    )?;
    let tenant_id = ctx.resolve_tenant_id()?;
    let result_value = service
        .create_download_url(CreateDownloadUrlCommand {
            tenant_id,
            node_id: payload.node_id,
            requested_ttl_seconds,
            request_base_url: state.download_public_base_url.clone(),
        })
        .await;
    let result = match result_value {
        Ok(result) => result,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_DOWNLOAD_URLS_CREATE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error),
                requested_ttl_seconds = requested_ttl_seconds
            );
            return Err(map_service_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_DOWNLOAD_URLS_CREATE,
        result = "ok",
        latency_ms = latency_ms,
        requested_ttl_seconds = requested_ttl_seconds,
        expires_at_epoch_ms = result.expires_at_epoch_ms,
        method = result.method.as_str()
    );

    Ok((
        StatusCode::CREATED,
        Json(CreateDownloadUrlResponse {
            download_url: result.download_url,
            signed_source_url: result.signed_source_url,
            expires_at_epoch_ms: result.expires_at_epoch_ms,
            method: result.method,
        }),
    ))
}

async fn resolve_download_token(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(token): Path<String>,
) -> Result<Response, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let tenant_id = ctx.resolve_tenant_id()?;
    let service = build_download_service(&state);
    let result_value = service
        .resolve_download_token(ResolveDownloadTokenCommand { tenant_id, token })
        .await;
    let result = match result_value {
        Ok(result) => result,
        Err(error) => {
            sdkwork_drive_observability::observe_route!(
                event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
                result = "err",
                latency_ms = elapsed_ms(started),
                error_kind = service_error_kind(&error),
                method = "GET"
            );
            return Err(map_download_token_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::APP_DOWNLOAD_TOKENS_RESOLVE,
        result = "ok",
        latency_ms = latency_ms,
        method = "GET"
    );

    Ok(Redirect::temporary(&result.signed_source_url).into_response())
}

async fn validate_archive_extraction_plan(
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

fn archive_extraction_target_conflict_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::CONFLICT,
        "conflict",
        "archive extraction target conflicts with an existing node",
        "drive.conflict",
    )
}

async fn ensure_archive_parent_folders(
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
            "archive.folder.created",
            operator_id,
        )
        .await?;
        current_parent = Some(folder_id);
    }
    Ok(current_parent)
}

async fn find_live_child_by_name(
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

async fn create_extracted_archive_file(
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
        "archive.entry.extracted",
        operator_id,
    )
    .await?;
    find_node(&state.pool, tenant_id, &node_id).await
}

async fn resolve_node_path(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
) -> Result<Vec<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let mut current_node_id = Some(node_id.to_string());
    let mut reversed = Vec::<DriveNodeResponse>::new();
    for _ in 0..128 {
        let Some(next_node_id) = current_node_id.take() else {
            reversed.reverse();
            return Ok(reversed);
        };
        let node = find_node(pool, tenant_id, &next_node_id).await?;
        current_node_id = node.parent_node_id.clone();
        reversed.push(node);
    }
    Err(problem(
        StatusCode::CONFLICT,
        "conflict",
        "node parent chain exceeds maximum depth",
        "drive.conflict",
    ))
}

async fn query_start_page_token(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: Option<&str>,
) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    if let Some(space_id) = space_id {
        sqlx::query_scalar(
            "SELECT COALESCE(MAX(sequence_no), 0)
             FROM dr_drive_change_log
             WHERE tenant_id=$1 AND space_id=$2",
        )
        .bind(tenant_id)
        .bind(space_id)
        .fetch_one(pool)
        .await
    } else {
        sqlx::query_scalar(
            "SELECT COALESCE(MAX(sequence_no), 0)
             FROM dr_drive_change_log
             WHERE tenant_id=$1",
        )
        .bind(tenant_id)
        .fetch_one(pool)
        .await
    }
    .map_err(internal_sql_error(
        "compute dr_drive_change_log start page token failed",
    ))
}

fn hash_watch_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.trim().as_bytes());
    format!("{:x}", hasher.finalize())
}

fn build_node_property_id(
    tenant_id: &str,
    node_id: &str,
    property_key: &str,
    visibility: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(tenant_id.trim().as_bytes());
    hasher.update([0]);
    hasher.update(node_id.trim().as_bytes());
    hasher.update([0]);
    hasher.update(visibility.trim().as_bytes());
    hasher.update([0]);
    hasher.update(property_key.trim().as_bytes());
    let digest = format!("{:x}", hasher.finalize());
    format!("p:{}", &digest[..62])
}

fn build_node_label_id(tenant_id: &str, node_id: &str, label_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(tenant_id.trim().as_bytes());
    hasher.update([0]);
    hasher.update(node_id.trim().as_bytes());
    hasher.update([0]);
    hasher.update(label_id.trim().as_bytes());
    let digest = format!("{:x}", hasher.finalize());
    format!("l:{}", &digest[..62])
}

fn build_favorite_id(
    tenant_id: &str,
    subject_type: &str,
    subject_id: &str,
    node_id: &str,
) -> String {
    format!(
        "fav:{}:{}:{}:{}",
        tenant_id, subject_type, subject_id, node_id
    )
}

async fn validate_target_parent(
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

async fn ensure_git_repository_space_root_accepts_node_type(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    parent_node_id: Option<&str>,
    node_type: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if parent_node_id.is_some() || node_type == "folder" {
        return Ok(());
    }

    let space_type = sqlx::query_scalar::<_, String>(
        "SELECT space_type
         FROM dr_drive_space
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "validate git repository space root node type failed",
    ))?;

    match space_type.as_deref() {
        Some("git_repository") => Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "git repository space root accepts only repository directories",
            "drive.validation.failed",
        )),
        Some(_) => Ok(()),
        None => Err(not_found_problem("space not found")),
    }
}

async fn ensure_restorable_subtree(
    pool: &AnyPool,
    tenant_id: &str,
    nodes: &[DriveNodeResponse],
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let restoring_ids = nodes
        .iter()
        .map(|node| node.id.as_str())
        .collect::<BTreeSet<_>>();
    let restoring_types = nodes
        .iter()
        .map(|node| (node.id.as_str(), node.node_type.as_str()))
        .collect::<BTreeMap<_, _>>();

    for node in nodes {
        ensure_git_repository_space_root_accepts_node_type(
            pool,
            tenant_id,
            &node.space_id,
            node.parent_node_id.as_deref(),
            &node.node_type,
        )
        .await?;

        let Some(parent_id) = node.parent_node_id.as_deref() else {
            continue;
        };
        if restoring_ids.contains(parent_id) {
            if restoring_types.get(parent_id).copied() != Some("folder") {
                return Err(problem(
                    StatusCode::CONFLICT,
                    "conflict",
                    "parent node must be active before restore",
                    "drive.conflict",
                ));
            }
            continue;
        }

        let row = sqlx::query(
            "SELECT space_id, node_type, lifecycle_status
             FROM dr_drive_node
             WHERE tenant_id=$1 AND id=$2",
        )
        .bind(tenant_id)
        .bind(parent_id)
        .fetch_optional(pool)
        .await
        .map_err(internal_sql_error("validate restore parent failed"))?;
        let Some(row) = row else {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "parent node must be active before restore",
                "drive.conflict",
            ));
        };
        let parent_space_id: String = row.get("space_id");
        let parent_node_type: String = row.get("node_type");
        let parent_lifecycle_status: String = row.get("lifecycle_status");
        if parent_space_id != node.space_id
            || parent_node_type != "folder"
            || parent_lifecycle_status != "active"
        {
            return Err(problem(
                StatusCode::CONFLICT,
                "conflict",
                "parent node must be active before restore",
                "drive.conflict",
            ));
        }
    }

    Ok(())
}

async fn ensure_target_parent_is_not_descendant(
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

async fn retire_space_contents(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    operator_id: &str,
) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    let node_ids = sqlx::query(
        "SELECT id
         FROM dr_drive_node
         WHERE tenant_id=$1 AND space_id=$2 AND lifecycle_status != 'deleted'",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_all(pool)
    .await
    .map_err(internal_sql_error(
        "list dr_drive_node for space retirement failed",
    ))?
    .into_iter()
    .map(|row| row.get::<String, _>("id"))
    .collect::<Vec<_>>();

    for node_id in &node_ids {
        sqlx::query(
            "UPDATE dr_drive_storage_object
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(operator_id)
        .bind(tenant_id)
        .bind(node_id)
        .execute(pool)
        .await
        .map_err(internal_sql_error(
            "retire dr_drive_storage_object for space failed",
        ))?;
    }

    sqlx::query(
        "UPDATE dr_drive_node
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND space_id=$3 AND lifecycle_status != 'deleted'",
    )
    .bind(operator_id)
    .bind(tenant_id)
    .bind(space_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error("retire dr_drive_node for space failed"))?;

    Ok(node_ids.len() as i64)
}

async fn resolve_storage_target(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    requested_bucket: Option<&str>,
    node_id: &str,
    object_id: &str,
    version_no: i64,
) -> Result<StorageTarget, (StatusCode, Json<ProblemDetail>)> {
    let default_target = match requested_bucket
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(bucket) => DefaultStorageProviderTarget {
            provider_id: find_active_storage_provider_by_bucket(pool, bucket)
                .await
                .map_err(map_service_error)?
                .ok_or_else(|| map_service_error(missing_signing_provider_error(bucket)))?
                .id,
            bucket: bucket.to_string(),
            storage_root_prefix: default_storage_root_prefix(tenant_id, Some(space_id)),
        },
        None => resolve_default_provider_target(pool, tenant_id, space_id).await?,
    };
    let standard_object_key =
        DriveStorageKeyService::build_object_key(BuildStorageObjectKeyCommand {
            tenant_id,
            space_id,
            node_id,
            version_no,
            object_id,
        })
        .map_err(|message| {
            problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                message,
                "drive.validation.failed",
            )
        })?;
    let object_key =
        join_storage_root_prefix(&default_target.storage_root_prefix, &standard_object_key)?;
    Ok(StorageTarget {
        provider_id: default_target.provider_id,
        bucket: default_target.bucket,
        object_key,
    })
}

async fn next_storage_object_version_no(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    sqlx::query_scalar(
        "SELECT COALESCE(MAX(version_no), 0) + 1
         FROM dr_drive_storage_object
         WHERE tenant_id=$1 AND node_id=$2",
    )
    .bind(tenant_id)
    .bind(node_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "compute dr_drive_storage_object version failed",
    ))
}

async fn resolve_default_provider_target(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
) -> Result<DefaultStorageProviderTarget, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT provider.id AS provider_id, provider.bucket, binding.storage_root_prefix
         FROM dr_drive_storage_provider_binding binding
         INNER JOIN dr_drive_storage_provider provider ON provider.id = binding.provider_id
         WHERE binding.tenant_id=$1
           AND binding.space_id=$2
           AND binding.purpose='primary'
           AND binding.lifecycle_status='active'
           AND provider.status='active'
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "resolve space dr_drive_storage_provider_binding failed",
    ))?;
    if let Some(row) = row {
        return Ok(DefaultStorageProviderTarget {
            provider_id: row.get("provider_id"),
            bucket: row.get("bucket"),
            storage_root_prefix: row.get("storage_root_prefix"),
        });
    }

    let row = sqlx::query(
        "SELECT provider.id AS provider_id, provider.bucket, binding.storage_root_prefix
         FROM dr_drive_storage_provider_binding binding
         INNER JOIN dr_drive_storage_provider provider ON provider.id = binding.provider_id
         INNER JOIN dr_drive_space space ON space.tenant_id = binding.tenant_id
           AND space.id = $2
           AND space.lifecycle_status = 'active'
         WHERE binding.tenant_id=$1
           AND binding.binding_scope='space_type'
           AND binding.purpose = space.space_type
           AND binding.lifecycle_status='active'
           AND provider.status='active'
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "resolve space_type dr_drive_storage_provider_binding failed",
    ))?;
    if let Some(row) = row {
        return Ok(DefaultStorageProviderTarget {
            provider_id: row.get("provider_id"),
            bucket: row.get("bucket"),
            storage_root_prefix: row.get("storage_root_prefix"),
        });
    }

    let row = sqlx::query(
        "SELECT provider.id AS provider_id, provider.bucket, binding.storage_root_prefix
         FROM dr_drive_storage_provider_binding binding
         INNER JOIN dr_drive_storage_provider provider ON provider.id = binding.provider_id
         WHERE binding.tenant_id=$1
           AND binding.space_id IS NULL
           AND binding.purpose='primary'
           AND binding.lifecycle_status='active'
           AND provider.status='active'
         LIMIT 1",
    )
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "resolve tenant dr_drive_storage_provider_binding failed",
    ))?;
    if let Some(row) = row {
        return Ok(DefaultStorageProviderTarget {
            provider_id: row.get("provider_id"),
            bucket: row.get("bucket"),
            storage_root_prefix: row.get("storage_root_prefix"),
        });
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "bucket is required when no default storage provider binding exists",
        "drive.validation.failed",
    ))
}

fn validate_create_file_idempotent_replay(
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

async fn ensure_no_live_name_conflict(
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

async fn ensure_node_id_available(
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

async fn ensure_upload_session_id_available(
    pool: &AnyPool,
    upload_session_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_upload_session
         WHERE id=$1",
    )
    .bind(upload_session_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "check dr_drive_upload_session id conflict failed",
    ))?;
    if count > 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "upload session id already exists",
            "drive.conflict",
        ));
    }
    Ok(())
}

async fn update_uploader_storage_target(
    pool: &AnyPool,
    tenant_id: &str,
    upload_item_id: &str,
    upload_session_id: &str,
    storage_target: &StorageTarget,
    storage_upload_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    sqlx::query(
        "UPDATE dr_drive_upload_session
         SET bucket=$1,
             object_key=$2,
             storage_provider_id=$3,
             storage_upload_id=$4,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$5 AND id=$6",
    )
    .bind(&storage_target.bucket)
    .bind(&storage_target.object_key)
    .bind(&storage_target.provider_id)
    .bind(storage_upload_id)
    .bind(tenant_id)
    .bind(upload_session_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "update uploader dr_drive_upload_session storage target failed",
    ))?;

    sqlx::query(
        "UPDATE dr_drive_upload_item
         SET storage_provider_id=$1,
             storage_upload_id=$2,
             updated_at=CURRENT_TIMESTAMP
         WHERE tenant_id=$3 AND id=$4",
    )
    .bind(&storage_target.provider_id)
    .bind(storage_upload_id)
    .bind(tenant_id)
    .bind(upload_item_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "update uploader dr_drive_upload_item storage target failed",
    ))?;
    Ok(())
}

async fn find_uploader_upload_item(
    pool: &AnyPool,
    tenant_id: &str,
    upload_item_id: &str,
) -> Result<Option<DriveUploadItem>, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(&format!(
        "SELECT {DRIVE_UPLOAD_ITEM_SELECT_COLUMNS}
         FROM dr_drive_upload_item
         WHERE tenant_id=$1 AND id=$2",
    ))
    .bind(tenant_id)
    .bind(upload_item_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_upload_item failed"))?;
    row.map(|row| map_uploader_upload_item_row(&row))
        .transpose()
}

async fn find_uploader_upload_item_by_session(
    pool: &AnyPool,
    tenant_id: &str,
    upload_session_id: &str,
) -> Result<Option<DriveUploadItem>, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(&format!(
        "SELECT {DRIVE_UPLOAD_ITEM_SELECT_COLUMNS}
         FROM dr_drive_upload_item
         WHERE tenant_id=$1 AND upload_session_id=$2",
    ))
    .bind(tenant_id)
    .bind(upload_session_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "find dr_drive_upload_item by session failed",
    ))?;
    row.map(|row| map_uploader_upload_item_row(&row))
        .transpose()
}

async fn complete_uploader_upload_item(
    pool: &AnyPool,
    completed: CompletedUploaderUploadItem<'_>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    sqlx::query(
        "UPDATE dr_drive_upload_item
         SET status='completed',
             checksum_sha256_hex=$1,
             uploaded_bytes=$2,
             uploaded_parts_count=$3,
             updated_by=$4,
             updated_at=CURRENT_TIMESTAMP
         WHERE tenant_id=$5
           AND id=$6
           AND upload_session_id=$7",
    )
    .bind(completed.checksum_sha256_hex)
    .bind(completed.content_length)
    .bind(completed.uploaded_parts_count)
    .bind(completed.operator_id)
    .bind(completed.tenant_id)
    .bind(&completed.upload_item.id)
    .bind(&completed.upload_session.id)
    .execute(pool)
    .await
    .map_err(internal_sql_error("complete dr_drive_upload_item failed"))?;

    record_uploader_upload_completed_operation(
        pool,
        UploaderUploadCompletedOperation {
            tenant_id: completed.tenant_id,
            upload_item: completed.upload_item,
            storage_object: completed.storage_object,
            upload_session: completed.upload_session,
            content_type: completed.content_type,
            content_length: completed.content_length,
            checksum_sha256_hex: completed.checksum_sha256_hex,
            operator_id: completed.operator_id,
            before_content_state: completed.before_content_state,
        },
    )
    .await
}

async fn record_uploader_upload_completed_operation(
    pool: &AnyPool,
    operation: UploaderUploadCompletedOperation<'_>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    sqlx::query(
        "INSERT INTO dr_drive_file_sensitive_operation (
            id, tenant_id, organization_id, user_id, space_id, node_id,
            storage_object_id, upload_item_id, operation_type, operation_reason,
            content_type, content_type_group, content_length, checksum_sha256_hex,
            object_bucket, object_key, before_lifecycle_status, after_lifecycle_status,
            operator_id, maintenance_job_id, request_id, trace_id, object_delete_status
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, 'upload_completed', 'user_request',
            $9, $10, $11, $12,
            $13, $14, $15, 'active',
            $16, NULL, NULL, NULL, 'not_required'
         )",
    )
    .bind(sensitive_operation_id(
        operation.tenant_id,
        "upload_completed",
        &operation.upload_item.id,
        &operation.storage_object.id,
    ))
    .bind(operation.tenant_id)
    .bind(&operation.upload_item.organization_id)
    .bind(&operation.upload_item.user_id)
    .bind(&operation.upload_item.space_id)
    .bind(&operation.upload_item.node_id)
    .bind(&operation.storage_object.id)
    .bind(&operation.upload_item.id)
    .bind(operation.content_type)
    .bind(&operation.upload_item.content_type_group)
    .bind(operation.content_length)
    .bind(operation.checksum_sha256_hex)
    .bind(&operation.upload_session.bucket)
    .bind(&operation.upload_session.object_key)
    .bind(operation.before_content_state)
    .bind(operation.operator_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "insert dr_drive_file_sensitive_operation upload_completed failed",
    ))?;
    Ok(())
}

struct CompletedUploaderUploadItem<'a> {
    tenant_id: &'a str,
    upload_item: &'a DriveUploadItem,
    storage_object: &'a CompletedStorageObjectInsertPlan,
    upload_session: &'a UploadSessionRecord,
    content_type: &'a str,
    content_length: i64,
    checksum_sha256_hex: &'a str,
    uploaded_parts_count: i64,
    operator_id: &'a str,
    before_content_state: &'a str,
}

struct UploaderUploadCompletedOperation<'a> {
    tenant_id: &'a str,
    upload_item: &'a DriveUploadItem,
    storage_object: &'a CompletedStorageObjectInsertPlan,
    upload_session: &'a UploadSessionRecord,
    content_type: &'a str,
    content_length: i64,
    checksum_sha256_hex: &'a str,
    operator_id: &'a str,
    before_content_state: &'a str,
}

fn sensitive_operation_id(
    tenant_id: &str,
    operation_type: &str,
    upload_item_id: &str,
    storage_object_id: &str,
) -> String {
    let raw = format!("{tenant_id}:{operation_type}:{upload_item_id}:{storage_object_id}");
    let digest = sha256_hex(raw.as_bytes());
    digest
        .strip_prefix("sha256:")
        .expect("sha256_hex should include prefix")
        .to_string()
}

async fn read_node_content_state(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let value = sqlx::query_scalar(
        "SELECT content_state
         FROM dr_drive_node
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status != 'deleted'",
    )
    .bind(tenant_id)
    .bind(node_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "read dr_drive_node content_state failed",
    ))?;
    value.ok_or_else(|| not_found_problem("node not found"))
}

async fn copy_active_storage_object_metadata(
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

struct NodeVersionStorageMetadata<'a> {
    tenant_id: &'a str,
    space_id: &'a str,
    node_id: &'a str,
    version_no: i64,
    storage_object_id: &'a str,
    content_type: &'a str,
    content_length: i64,
    checksum_sha256_hex: &'a str,
}

struct NodeVersionAttribution<'a> {
    version_kind: &'a str,
    change_source: &'a str,
    change_summary: Option<&'a str>,
    app_id: Option<&'a str>,
    app_resource_type: Option<&'a str>,
    app_resource_id: Option<&'a str>,
    scene: Option<&'a str>,
    source: Option<&'a str>,
}

async fn insert_node_version_for_storage_object(
    pool: &AnyPool,
    storage: NodeVersionStorageMetadata<'_>,
    upload_item: Option<&DriveUploadItem>,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    insert_node_version_metadata(
        pool,
        storage,
        NodeVersionAttribution {
            version_kind: "auto",
            change_source: if upload_item.is_some() {
                "uploader"
            } else {
                "app_api"
            },
            change_summary: None,
            app_id: upload_item.map(|item| item.app_id.as_str()),
            app_resource_type: upload_item.map(|item| item.app_resource_type.as_str()),
            app_resource_id: upload_item.map(|item| item.app_resource_id.as_str()),
            scene: upload_item.and_then(|item| item.scene.as_deref()),
            source: upload_item.and_then(|item| item.source.as_deref()),
        },
        operator_id,
    )
    .await
}

async fn insert_node_version_metadata(
    pool: &AnyPool,
    metadata: NodeVersionStorageMetadata<'_>,
    attribution: NodeVersionAttribution<'_>,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let version_id = next_drive_id("ver");
    sqlx::query(
        "INSERT INTO dr_drive_node_version (
            id, tenant_id, space_id, node_id, version_no, storage_object_id,
            content_type, content_length, checksum_sha256_hex, version_kind,
            version_label, change_source, change_summary, restored_from_version_id,
            app_id, app_resource_type, app_resource_id, scene, source,
            lifecycle_status, created_by, updated_by
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            NULL, $11, $12, NULL, $13, $14, $15, $16, $17,
            'active', $18, $18
         )",
    )
    .bind(version_id)
    .bind(metadata.tenant_id)
    .bind(metadata.space_id)
    .bind(metadata.node_id)
    .bind(metadata.version_no)
    .bind(metadata.storage_object_id)
    .bind(metadata.content_type)
    .bind(metadata.content_length)
    .bind(metadata.checksum_sha256_hex)
    .bind(attribution.version_kind)
    .bind(attribution.change_source)
    .bind(attribution.change_summary)
    .bind(attribution.app_id)
    .bind(attribution.app_resource_type)
    .bind(attribution.app_resource_id)
    .bind(attribution.scene)
    .bind(attribution.source)
    .bind(operator_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error("insert dr_drive_node_version failed"))?;
    Ok(())
}

async fn find_upload_session(
    pool: &AnyPool,
    tenant_id: &str,
    upload_session_id: &str,
) -> Result<UploadSessionRecord, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, space_id, node_id, bucket, object_key,
                idempotency_key, storage_provider_id, storage_upload_id, state,
                expires_at_epoch_ms, version
         FROM dr_drive_upload_session
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(tenant_id)
    .bind(upload_session_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_upload_session failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("upload session not found"));
    };
    Ok(map_upload_session_row(&row))
}

async fn find_upload_session_by_idempotency(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    node_id: &str,
    idempotency_key: &str,
) -> Result<Option<UploadSessionRecord>, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, space_id, node_id, bucket, object_key,
                idempotency_key, storage_provider_id, storage_upload_id, state,
                expires_at_epoch_ms, version
         FROM dr_drive_upload_session
         WHERE tenant_id=$1
           AND space_id=$2
           AND node_id=$3
           AND idempotency_key=$4
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "find dr_drive_upload_session by idempotency failed",
    ))?;
    Ok(row.as_ref().map(map_upload_session_row))
}

fn map_upload_session_row(row: &sqlx::any::AnyRow) -> UploadSessionRecord {
    UploadSessionRecord {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        node_id: row.get("node_id"),
        bucket: row.get("bucket"),
        object_key: row.get("object_key"),
        idempotency_key: row.get("idempotency_key"),
        storage_provider_id: row.get("storage_provider_id"),
        storage_upload_id: row.get("storage_upload_id"),
        state: row.get("state"),
        expires_at_epoch_ms: row.get("expires_at_epoch_ms"),
        version: row.get("version"),
    }
}

async fn initiate_storage_multipart_upload(
    state: &AppState,
    target: &StorageTarget,
) -> Result<CreatedStorageMultipartUpload, (StatusCode, Json<ProblemDetail>)> {
    let provider = find_storage_provider_by_id(&state.pool, &target.provider_id)
        .await
        .map_err(map_service_error)?;
    let Some(provider) = provider else {
        return Err(map_service_error(missing_signing_provider_error(
            &target.bucket,
        )));
    };
    let provider =
        require_active_storage_provider(provider, &target.bucket).map_err(map_service_error)?;
    let Some(object_store) = build_s3_object_store_for_provider(&provider)
        .await
        .map_err(map_service_error)?
    else {
        return Err(map_service_error(unsupported_signing_provider_error(
            &target.bucket,
        )));
    };
    let created = object_store
        .create_multipart_upload(CreateMultipartUploadRequest {
            locator: DriveObjectLocator {
                bucket: target.bucket.clone(),
                object_key: target.object_key.clone(),
            },
            content_type: None,
            metadata: BTreeMap::new(),
            checksum_sha256_hex: None,
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(CreatedStorageMultipartUpload {
        upload_id: created.upload_id,
    })
}

async fn complete_storage_multipart_upload(
    state: &AppState,
    upload_session: &UploadSessionRecord,
    parts: &[CompletedUploadPartRequest],
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let provider = find_storage_provider_by_id(&state.pool, &upload_session.storage_provider_id)
        .await
        .map_err(map_service_error)?;
    let Some(provider) = provider else {
        return Err(map_service_error(missing_signing_provider_error(
            &upload_session.bucket,
        )));
    };
    let provider = require_active_storage_provider(provider, &upload_session.bucket)
        .map_err(map_service_error)?;
    let Some(object_store) = build_s3_object_store_for_provider(&provider)
        .await
        .map_err(map_service_error)?
    else {
        return Err(map_service_error(unsupported_signing_provider_error(
            &upload_session.bucket,
        )));
    };
    object_store
        .complete_multipart_upload(CompleteMultipartUploadRequest {
            locator: DriveObjectLocator {
                bucket: upload_session.bucket.clone(),
                object_key: upload_session.object_key.clone(),
            },
            upload_id: upload_session.storage_upload_id.clone(),
            parts: parts
                .iter()
                .map(|part| CompletedMultipartPart {
                    part_number: part.part_no,
                    etag: part.etag.trim().to_string(),
                })
                .collect(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(())
}

async fn abort_storage_multipart_upload(
    state: &AppState,
    upload_session: &UploadSessionRecord,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let provider = find_storage_provider_by_id(&state.pool, &upload_session.storage_provider_id)
        .await
        .map_err(map_service_error)?;
    let Some(provider) = provider else {
        return Err(map_service_error(missing_signing_provider_error(
            &upload_session.bucket,
        )));
    };
    let provider = require_active_storage_provider(provider, &upload_session.bucket)
        .map_err(map_service_error)?;
    let Some(object_store) = build_s3_object_store_for_provider(&provider)
        .await
        .map_err(map_service_error)?
    else {
        return Err(map_service_error(unsupported_signing_provider_error(
            &upload_session.bucket,
        )));
    };
    object_store
        .abort_multipart_upload(AbortMultipartUploadRequest {
            locator: DriveObjectLocator {
                bucket: upload_session.bucket.clone(),
                object_key: upload_session.object_key.clone(),
            },
            upload_id: upload_session.storage_upload_id.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(())
}

fn validate_mutable_upload_session(
    upload_session: &UploadSessionRecord,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    match upload_session.state.as_str() {
        "created" | "uploading" => Ok(()),
        "completing" | "completed" | "aborted" | "expired" => Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            format!(
                "upload session cannot be modified from {} state",
                upload_session.state
            ),
            "drive.conflict",
        )),
        _ => Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "upload session state is invalid",
            "drive.validation.failed",
        )),
    }
}

async fn plan_completed_storage_object_insert(
    pool: &AnyPool,
    tenant_id: &str,
    upload_session: &UploadSessionRecord,
) -> Result<CompletedStorageObjectInsertPlan, (StatusCode, Json<ProblemDetail>)> {
    let version_no = parse_storage_object_version_no_from_key(
        &upload_session.object_key,
        tenant_id,
        &upload_session.space_id,
        &upload_session.node_id,
    )?;
    let next_version_no =
        next_storage_object_version_no(pool, tenant_id, &upload_session.node_id).await?;
    if version_no != next_version_no {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "upload session storage object version does not match next file version",
            "drive.conflict",
        ));
    }
    let id = format!("{}-v{}", upload_session.id, version_no);

    let id_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_storage_object
         WHERE id=$1",
    )
    .bind(&id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "check dr_drive_storage_object id conflict failed",
    ))?;
    if id_count > 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "storage object id already exists",
            "drive.conflict",
        ));
    }

    let active_locator_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_storage_object
         WHERE tenant_id=$1
           AND node_id=$2
           AND bucket=$3
           AND object_key=$4
           AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(&upload_session.node_id)
    .bind(&upload_session.bucket)
    .bind(&upload_session.object_key)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "check dr_drive_storage_object active locator conflict failed",
    ))?;
    if active_locator_count > 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "active storage object locator already exists",
            "drive.conflict",
        ));
    }

    Ok(CompletedStorageObjectInsertPlan { id, version_no })
}

fn parse_storage_object_version_no_from_key(
    object_key: &str,
    tenant_id: &str,
    space_id: &str,
    node_id: &str,
) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    let invalid = || {
        problem(
            StatusCode::CONFLICT,
            "conflict",
            "upload session object key is not a standard Drive storage key",
            "drive.conflict",
        )
    };
    let standard_object_key = standard_storage_object_key_suffix(object_key).ok_or_else(invalid)?;
    let segments: Vec<&str> = standard_object_key.split('/').collect();
    if segments.len() != 16
        || segments[0] != "sdkwork-drive"
        || segments[1] != "v1"
        || segments[2] != "t"
        || segments[4] != "tenants"
        || segments[5] != tenant_id
        || segments[6] != "spaces"
        || segments[7] != space_id
        || segments[8] != "nodes"
        || segments[9] != "n"
        || segments[11] != node_id
        || segments[12] != "versions"
        || segments[15] != "content"
    {
        return Err(invalid());
    }

    let raw_version_no = segments[13];
    if raw_version_no.len() != 10 || !raw_version_no.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(invalid());
    }
    let version_no = raw_version_no.parse::<i64>().map_err(|_| invalid())?;
    if version_no < 1 {
        return Err(invalid());
    }

    let expected = DriveStorageKeyService::build_object_key(BuildStorageObjectKeyCommand {
        tenant_id,
        space_id,
        node_id,
        version_no,
        object_id: segments[14],
    })
    .map_err(|_| invalid())?;
    if expected != standard_object_key {
        return Err(invalid());
    }

    Ok(version_no)
}

fn standard_storage_object_key_suffix(object_key: &str) -> Option<&str> {
    object_key
        .rmatch_indices("sdkwork-drive/v1/t/")
        .next()
        .map(|(index, _)| &object_key[index..])
}

fn validate_completed_multipart_parts(
    parts: &[CompletedUploadPartRequest],
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if parts.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "parts are required",
            "drive.validation.failed",
        ));
    }
    if parts.len() > 10_000 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "parts must contain at most 10000 items",
            "drive.validation.failed",
        ));
    }

    let mut previous_part_no = 0_u16;
    for part in parts {
        if part.part_no == 0 || part.part_no > 10_000 {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "partNo must be between 1 and 10000",
                "drive.validation.failed",
            ));
        }
        if part.etag.trim().is_empty() {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "etag is required for every part",
                "drive.validation.failed",
            ));
        }
        if part.part_no <= previous_part_no {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "parts must be sorted by ascending unique partNo",
                "drive.validation.failed",
            ));
        }
        previous_part_no = part.part_no;
    }

    Ok(())
}

async fn update_upload_session_state(
    pool: &AnyPool,
    tenant_id: &str,
    upload_session_id: &str,
    next_state: &str,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let affected = sqlx::query(
        "UPDATE dr_drive_upload_session
         SET state=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$3 AND id=$4",
    )
    .bind(next_state)
    .bind(operator_id)
    .bind(tenant_id)
    .bind(upload_session_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "update dr_drive_upload_session state failed",
    ))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("upload session not found"));
    }
    Ok(())
}

async fn claim_upload_session_completion(
    pool: &AnyPool,
    upload_session: &UploadSessionRecord,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let affected = sqlx::query(
        "UPDATE dr_drive_upload_session
         SET state='completing', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2
           AND id=$3
           AND version=$4
           AND state IN ('created', 'uploading')",
    )
    .bind(operator_id)
    .bind(&upload_session.tenant_id)
    .bind(&upload_session.id)
    .bind(upload_session.version)
    .execute(pool)
    .await
    .map_err(internal_sql_error(
        "claim dr_drive_upload_session completion failed",
    ))?
    .rows_affected();
    if affected == 0 {
        return Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "upload session completion is already in progress or no longer mutable",
            "drive.conflict",
        ));
    }
    Ok(())
}

async fn set_node_lifecycle(
    state: AppState,
    ctx: &DriveRequestContext,
    node_id: String,
    payload: NodeCommandRequest,
    lifecycle_status: &str,
    event_type: &str,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    let nodes_to_update = collect_node_subtree(&state.pool, &tenant_id, &node).await?;
    if lifecycle_status == "active" {
        ensure_restorable_subtree(&state.pool, &tenant_id, &nodes_to_update).await?;
    }
    let mut updated_count = 0_u64;
    for node_to_update in &nodes_to_update {
        let affected = sqlx::query(
            "UPDATE dr_drive_node
             SET lifecycle_status=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$3 AND id=$4 AND lifecycle_status != 'deleted'",
        )
        .bind(lifecycle_status)
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_to_update.id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("update dr_drive_node lifecycle failed"))?
        .rows_affected();
        updated_count += affected;
        if affected > 0 {
            record_change(
                &state.pool,
                &tenant_id,
                &node_to_update.space_id,
                Some(&node_to_update.id),
                event_type,
                &operator_id,
            )
            .await?;
        }
    }
    if updated_count == 0 {
        return Err(not_found_problem("node not found"));
    }
    Ok(Json(find_node(&state.pool, &tenant_id, &node_id).await?))
}

async fn insert_watch_channel(
    pool: &AnyPool,
    command: InsertWatchChannel<'_>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let result = sqlx::query(
        "INSERT INTO dr_drive_watch_channel (
            id, tenant_id, space_id, node_id, resource_type, resource_id,
            channel_type, address, token_hash, expiration_epoch_ms,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', 1, $11, $11)",
    )
    .bind(command.id)
    .bind(command.tenant_id)
    .bind(command.space_id)
    .bind(command.node_id)
    .bind(command.resource_type)
    .bind(command.resource_id)
    .bind(command.channel_type)
    .bind(command.address)
    .bind(command.token_hash)
    .bind(command.expiration_epoch_ms)
    .bind(command.operator_id)
    .execute(pool)
    .await;

    match result {
        Ok(_) => Ok(()),
        Err(error) if is_unique_constraint_error(&error) => Err(problem(
            StatusCode::CONFLICT,
            "conflict",
            "watch channel id already exists",
            "drive.conflict",
        )),
        Err(error) => Err(internal_problem(format!(
            "insert dr_drive_watch_channel failed: {error}"
        ))),
    }
}

async fn record_change(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    node_id: Option<&str>,
    event_type: &str,
    actor_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let cursor_id = format!("cursor:{tenant_id}:{space_id}");
    let next_sequence: i64 = sqlx::query_scalar(
        "INSERT INTO dr_drive_change_cursor (
            id, tenant_id, space_id, last_sequence_no
         ) VALUES ($1, $2, $3, 1)
         ON CONFLICT(tenant_id, space_id) DO UPDATE SET
            last_sequence_no=dr_drive_change_cursor.last_sequence_no + 1,
            updated_at=CURRENT_TIMESTAMP
         RETURNING last_sequence_no",
    )
    .bind(&cursor_id)
    .bind(tenant_id)
    .bind(space_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "allocate dr_drive_change_log sequence failed",
    ))?;

    let change_log_id = next_drive_runtime_id("drive change log").map_err(map_service_error)?;
    sqlx::query(
        "INSERT INTO dr_drive_change_log (
            id, tenant_id, space_id, node_id, sequence_no, event_type, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(change_log_id)
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_id)
    .bind(next_sequence)
    .bind(event_type)
    .bind(actor_id)
    .execute(pool)
    .await
    .map_err(internal_sql_error("insert dr_drive_change_log failed"))?;

    let outbox_id = next_drive_runtime_id("domain outbox").map_err(map_service_error)?;
    let payload_json = json!({
        "tenantId": tenant_id,
        "spaceId": space_id,
        "nodeId": node_id,
        "eventType": event_type,
        "sequenceNo": next_sequence,
        "actorId": actor_id,
        "resourceType": "changes",
    })
    .to_string();
    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox (
            id, tenant_id, space_id, node_id, event_type, actor_id,
            sequence_no, payload_json, delivery_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')",
    )
    .bind(outbox_id)
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_id)
    .bind(event_type)
    .bind(actor_id)
    .bind(next_sequence)
    .bind(payload_json)
    .execute(pool)
    .await
    .map_err(internal_sql_error("insert dr_drive_domain_outbox failed"))?;
    sdkwork_drive_observability::metrics::record_outbox_pending();
    spawn_pending_outbox_dispatch(pool.clone());
    Ok(())
}

fn upload_session_state_as_str(state: &DriveUploadSessionState) -> &'static str {
    match state {
        DriveUploadSessionState::Created => "created",
        DriveUploadSessionState::Uploading => "uploading",
        DriveUploadSessionState::Completing => "completing",
        DriveUploadSessionState::Completed => "completed",
        DriveUploadSessionState::Aborted => "aborted",
        DriveUploadSessionState::Expired => "expired",
    }
}
