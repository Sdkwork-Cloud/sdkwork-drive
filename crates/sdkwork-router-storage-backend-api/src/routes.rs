use crate::auth::drive_context_projection_guard;
use crate::config::AdminStorageConfig;
use crate::handlers::*;
use crate::state::AdminStorageState;
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
        .expect("create in-memory sqlite any pool for admin storage api");
    build_router_with_pool(pool)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_pool_and_config(pool, AdminStorageConfig::default())
}

pub fn build_router_with_pool_and_config(pool: AnyPool, config: AdminStorageConfig) -> Router {
    build_router_with_state(AdminStorageState::new(pool, config), true)
}

pub fn build_router_with_pool_and_iam_policy(
    pool: AnyPool,
    auth_policy: DriveAuthValidationPolicy,
) -> Router {
    build_router_with_state(
        AdminStorageState::with_auth_policy(pool, AdminStorageConfig::default(), auth_policy),
        true,
    )
}

pub fn build_router_with_pool_config_and_iam_policy(
    pool: AnyPool,
    config: AdminStorageConfig,
    auth_policy: DriveAuthValidationPolicy,
) -> Router {
    build_router_with_state(
        AdminStorageState::with_auth_policy(pool, config, auth_policy),
        true,
    )
}

pub fn build_router_with_pool_without_iam(pool: AnyPool) -> Router {
    build_router_with_state(
        AdminStorageState::new(pool, AdminStorageConfig::default()),
        false,
    )
}

pub fn build_router_with_pool_config_without_iam(
    pool: AnyPool,
    config: AdminStorageConfig,
) -> Router {
    build_router_with_state(AdminStorageState::new(pool, config), false)
}

pub async fn build_router_with_database_url(database_url: &str) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    let admin_storage_config =
        AdminStorageConfig::from_env().map_err(|error| sqlx::Error::Configuration(error.into()))?;
    build_router_with_database_url_config_parts(&config, admin_storage_config).await
}

pub async fn build_router_with_database_url_and_admin_storage_config(
    database_url: &str,
    admin_storage_config: AdminStorageConfig,
) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    build_router_with_database_url_config_parts(&config, admin_storage_config).await
}

pub async fn build_router_with_database_config(
    config: &DatabaseConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let admin_storage_config =
        AdminStorageConfig::from_env().map_err(admin_storage_config_error)?;
    build_router_with_database_config_and_admin_storage_config(config, admin_storage_config).await
}

pub async fn build_router_with_database_config_and_admin_storage_config(
    config: &DatabaseConfig,
    admin_storage_config: AdminStorageConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let pool = connect_any_database_and_install_schema(config).await?;
    Ok(build_router_with_pool_and_config(
        pool,
        admin_storage_config,
    ))
}

async fn build_router_with_database_url_config_parts(
    config: &DatabaseConfig,
    admin_storage_config: AdminStorageConfig,
) -> Result<Router, sqlx::Error> {
    let pool = connect_any_database_and_install_schema(config).await?;
    Ok(build_router_with_pool_and_config(
        pool,
        admin_storage_config,
    ))
}

fn admin_storage_config_error(error: String) -> Box<dyn std::error::Error + Send + Sync> {
    std::io::Error::new(std::io::ErrorKind::InvalidInput, error).into()
}

fn build_router_with_state(state: AdminStorageState, require_iam: bool) -> Router {
    let mut drive_routes = Router::new()
        .route(
            "/admin/v3/api/drive/storage/providers",
            get(list_storage_providers).post(create_storage_provider),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}",
            get(get_storage_provider)
                .patch(update_storage_provider)
                .delete(delete_storage_provider),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/capabilities",
            get(get_storage_provider_capabilities),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/test",
            post(test_storage_provider),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/activate",
            post(activate_storage_provider),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/deactivate",
            post(deactivate_storage_provider),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/credentials/rotate",
            post(rotate_storage_provider_credentials),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/bucket",
            get(head_storage_provider_bucket)
                .put(create_storage_provider_bucket)
                .delete(delete_storage_provider_bucket),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/buckets",
            get(list_storage_provider_buckets),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/objects",
            get(list_storage_provider_objects),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/objects/copy",
            post(copy_storage_provider_object),
        )
        .route(
            "/admin/v3/api/drive/storage/providers/{provider_id}/objects/{*object_key}",
            get(head_storage_provider_object).delete(delete_storage_provider_object),
        )
        .route(
            "/admin/v3/api/drive/storage/bindings/default",
            get(get_default_storage_provider_binding)
                .put(set_default_storage_provider_binding)
                .delete(delete_default_storage_provider_binding),
        )
        .route(
            "/admin/v3/api/drive/storage/bindings",
            get(list_storage_provider_bindings),
        );

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
