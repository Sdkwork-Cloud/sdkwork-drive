use crate::auth::drive_context_projection_guard;
use crate::handlers::*;
use crate::state::BackendState;
use crate::web_bootstrap::wrap_router_with_web_framework;
use axum::middleware;
use axum::routing::{get, post};
use axum::Router;
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

pub fn build_router() -> Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite any pool for backend api");
    build_router_with_state(BackendState::new(pool), true)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_state(BackendState::new(pool), false)
}

pub fn build_router_with_pool_and_iam(pool: AnyPool) -> Router {
    build_router_with_state(BackendState::new(pool), true)
}

pub fn build_router_with_pool_and_iam_policy(
    pool: AnyPool,
    auth_policy: DriveAuthValidationPolicy,
) -> Router {
    build_router_with_state(BackendState::with_auth_policy(pool, auth_policy), true)
}

pub async fn build_router_with_database_url(database_url: &str) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    let pool = connect_any_database_and_install_schema(&config).await?;
    Ok(build_router_with_state(BackendState::new(pool), true))
}

pub async fn build_router_with_database_config(
    config: &DatabaseConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let pool = connect_any_database_and_install_schema(config)
        .await
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error + Send + Sync>)?;
    Ok(build_router_with_state(BackendState::new(pool), true))
}

fn build_router_with_state(state: BackendState, require_iam: bool) -> Router {
    let mut drive_routes = Router::new()
        .route(
            "/backend/v3/api/drive/storage_providers",
            get(list_storage_providers).post(create_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}",
            get(get_storage_provider)
                .patch(update_storage_provider)
                .delete(delete_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/test",
            post(test_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/capabilities",
            get(get_storage_provider_capabilities),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/activate",
            post(activate_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/deactivate",
            post(deactivate_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/credentials/rotate",
            post(rotate_storage_provider_credentials),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/bucket",
            get(head_storage_provider_bucket)
                .put(create_storage_provider_bucket)
                .delete(delete_storage_provider_bucket),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/objects",
            get(list_storage_provider_objects),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/objects/copy",
            post(copy_storage_provider_object),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/{provider_id}/objects/{*object_key}",
            get(head_storage_provider_object).delete(delete_storage_provider_object),
        )
        .route(
            "/backend/v3/api/drive/storage_provider_bindings/default",
            get(get_default_storage_provider_binding).put(set_default_storage_provider_binding),
        )
        .route(
            "/backend/v3/api/drive/labels",
            get(list_labels).post(create_label),
        )
        .route(
            "/backend/v3/api/drive/labels/{label_id}",
            get(get_label).patch(update_label).delete(delete_label),
        )
        .route("/backend/v3/api/drive/audit_events", get(list_audit_events))
        .route(
            "/backend/v3/api/drive/maintenance/object_sweep",
            post(sweep_object_store),
        )
        .route(
            "/backend/v3/api/drive/maintenance/upload_session_sweep",
            post(sweep_upload_sessions),
        )
        .route(
            "/backend/v3/api/drive/maintenance/jobs",
            get(list_maintenance_jobs),
        )
        .route(
            "/backend/v3/api/drive/download_packages",
            get(list_download_packages),
        )
        .route("/backend/v3/api/drive/spaces", get(list_spaces))
        .route("/backend/v3/api/drive/quotas", get(list_quotas));

    if require_iam {
        drive_routes =
            drive_routes.route_layer(middleware::from_fn(drive_context_projection_guard));
    }

    let mut router = Router::new()
        .route("/healthz", get(health))
        .route("/metrics", get(metrics))
        .merge(drive_routes)
        .layer(middleware::from_fn(
            sdkwork_drive_http::metrics::record_request_metrics,
        ))
        .with_state(state);

    if require_iam {
        router = wrap_router_with_web_framework(
            sdkwork_web_core::DefaultWebRequestContextResolver::default(),
            router,
        );
    }

    router
}
