use crate::handlers::{create_share_link_download_url, health, resolve_share_link};
use crate::state::OpenState;
use axum::routing::{get, post};
use axum::Router;
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_product::infrastructure::sql::connect_any_database_and_install_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

pub fn build_router() -> Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite any pool for open api");
    build_router_with_state(OpenState::new(pool))
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_state(OpenState::new(pool))
}

pub async fn build_router_with_database_url(database_url: &str) -> Result<Router, sqlx::Error> {
    let config = DatabaseConfig::from_url(database_url)
        .map_err(|error| sqlx::Error::Configuration(Box::new(error)))?;
    let pool = connect_any_database_and_install_schema(&config).await?;
    Ok(build_router_with_state(OpenState::new(pool)))
}

pub async fn build_router_with_database_config(
    config: &DatabaseConfig,
) -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let pool = connect_any_database_and_install_schema(config)
        .await
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error + Send + Sync>)?;
    Ok(build_router_with_state(OpenState::new(pool)))
}

fn build_router_with_state(state: OpenState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route(
            "/open/v3/api/drive/share_links/:token",
            get(resolve_share_link),
        )
        .route(
            "/open/v3/api/drive/share_links/:token/download_url",
            post(create_share_link_download_url),
        )
        .with_state(state)
}
