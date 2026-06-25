use crate::constants::DEFAULT_DOWNLOAD_PUBLIC_BASE_URL;
use crate::handlers::*;
use crate::state::AppState;
use axum::middleware;
use axum::routing::{get, post, put};
use axum::Router;
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::ensure_domain_outbox_dispatcher;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

pub fn build_router() -> Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite any pool for app api");
    build_router_with_pool_and_iam(pool)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_pool_and_iam(pool)
}

pub fn build_router_with_pool_and_iam(pool: AnyPool) -> Router {
    let router = build_router_with_state(AppState::new(pool), true);
    crate::web_bootstrap::wrap_router_with_web_framework(
        sdkwork_web_core::DefaultWebRequestContextResolver::default(),
        router,
    )
}

pub async fn build_protected_router_with_pool(pool: AnyPool) -> Router {
    let router = build_router_with_state(
        AppState::with_urls(
            pool,
            std::env::var("SDKWORK_DRIVE_PUBLIC_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string()),
        ),
        true,
    );
    crate::web_bootstrap::wrap_router_with_web_framework_from_env(router).await
}

pub async fn build_router_with_database_url(database_url: &str) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    let pool = connect_any_database_and_install_schema(&config).await?;
    Ok(build_protected_router_with_pool(pool).await)
}

pub async fn build_router_with_database_config(
    config: &DatabaseConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let pool = connect_any_database_and_install_schema(config)
        .await
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error + Send + Sync>)?;
    ensure_domain_outbox_dispatcher(pool.clone());
    Ok(build_protected_router_with_pool(pool).await)
}

fn build_router_with_state(state: AppState, _require_iam: bool) -> Router {
    let drive_routes = Router::new()
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
            "/app/v3/api/drive/nodes/{node_id}/download_grants",
            post(create_node_download_grant),
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
            "/app/v3/api/drive/share_links/{token}/claim",
            post(claim_share_link),
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

    let forbidden_asset_routes = Router::new()
        .route(
            "/app/v3/api/assets/upload",
            post(asset_upload_not_implemented),
        )
        .route(
            "/app/v3/api/assets/presign",
            post(asset_upload_not_implemented),
        )
        .route(
            "/app/v3/api/assets/upload_sessions",
            post(asset_upload_not_implemented),
        );

    Router::new()
        .route("/healthz", get(health))
        .route("/readyz", get(ready))
        .route("/metrics", get(metrics))
        .merge(
            drive_routes
                .merge(forbidden_asset_routes)
                .route_layer(middleware::from_fn(crate::rate_limit::app_api_rate_limit)),
        )
        .layer(middleware::from_fn(
            sdkwork_drive_http::problem_correlation::problem_correlation_middleware,
        ))
        .layer(middleware::from_fn(
            sdkwork_drive_http::metrics::record_request_metrics,
        ))
        .with_state(state)
}
