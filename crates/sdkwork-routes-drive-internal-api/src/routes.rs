use axum::middleware;
use axum::routing::{get, post};
use axum::Router;
use sqlx::AnyPool;

use crate::content::retrieve_drive_resource_content;
use crate::handlers::{
    create_root_scope_subscription, resolve_drive_resource, retrieve_root_scope_subscription,
};
use crate::state::InternalApiState;

fn business_router(state: InternalApiState) -> Router {
    Router::new()
        .route(
            "/internal/v3/api/drive/root_scope_subscriptions",
            post(create_root_scope_subscription),
        )
        .route(
            "/internal/v3/api/drive/root_scope_subscriptions/{subscriptionUuid}",
            get(retrieve_root_scope_subscription),
        )
        .route(
            "/internal/v3/api/drive/resource_resolutions",
            post(resolve_drive_resource),
        )
        .route(
            "/internal/v3/api/drive/node_versions/{nodeVersionId}/content",
            get(retrieve_drive_resource_content),
        )
        .layer(middleware::from_fn(
            sdkwork_drive_http::problem_correlation::problem_correlation_middleware,
        ))
        .with_state(state)
}

pub fn build_router_with_pool(pool: AnyPool) -> Router {
    let router = business_router(InternalApiState::new(pool));
    crate::web_bootstrap::wrap_with_default_resolver(router).layer(middleware::from_fn(
        sdkwork_drive_http::metrics::record_request_metrics,
    ))
}

pub async fn build_protected_router_with_pool(pool: AnyPool) -> Router {
    let router = business_router(InternalApiState::new(pool));
    crate::web_bootstrap::wrap_from_env(router)
        .await
        .layer(middleware::from_fn(
            sdkwork_drive_http::metrics::record_request_metrics,
        ))
}

pub async fn gateway_mount_business(pool: AnyPool) -> Router {
    build_protected_router_with_pool(pool).await
}

pub async fn gateway_mount(pool: AnyPool) -> Router {
    build_protected_router_with_pool(pool).await
}
