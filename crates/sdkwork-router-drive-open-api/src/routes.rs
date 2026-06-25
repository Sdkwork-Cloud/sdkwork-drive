use crate::handlers::{create_share_link_download_url, health, metrics, ready, resolve_share_link};
use crate::rate_limit::share_link_rate_limit;
use crate::state::OpenState;
use crate::web_bootstrap::{wrap_router_with_dev_open_api_web_framework, wrap_router_with_web_framework_from_env};
use axum::middleware;
use axum::routing::{get, post};
use axum::Router;
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

pub fn build_router() -> Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite any pool for open api");
    build_router_with_pool(pool)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    let router = build_router_with_state(OpenState::new(pool));
    wrap_router_with_dev_open_api_web_framework(router)
}

pub async fn build_protected_router_with_pool(pool: AnyPool) -> Router {
    let router = build_router_with_state(OpenState::new(pool));
    wrap_router_with_web_framework_from_env(router).await
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
    Ok(build_protected_router_with_pool(pool).await)
}

fn build_router_with_state(state: OpenState) -> Router {
    let share_routes = Router::new()
        .route(
            "/open/v3/api/drive/share_links/{token}",
            get(resolve_share_link),
        )
        .route(
            "/open/v3/api/drive/share_links/{token}/download_url",
            post(create_share_link_download_url),
        )
        .route_layer(middleware::from_fn(share_link_rate_limit));

    Router::new()
        .route("/healthz", get(health))
        .route("/readyz", get(ready))
        .route("/metrics", get(metrics))
        .merge(share_routes)
        .layer(middleware::from_fn(
            sdkwork_drive_http::problem_correlation::problem_correlation_middleware,
        ))
        .layer(middleware::from_fn(
            sdkwork_drive_http::metrics::record_request_metrics,
        ))
        .with_state(state)
}
