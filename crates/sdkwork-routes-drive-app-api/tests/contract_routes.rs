use axum::body::Body;
use http::{Method, Request, StatusCode};
use sdkwork_routes_drive_app_api::build_router_with_pool_and_iam;
use sqlx::any::AnyPoolOptions;
use tower::util::ServiceExt;

fn build_router() -> axum::Router {
    sqlx::any::install_default_drivers();
    build_router_with_pool_and_iam(
        AnyPoolOptions::new()
            .max_connections(1)
            .connect_lazy("sqlite::memory:")
            .expect("create app API test pool"),
    )
}

#[tokio::test]
async fn app_router_exposes_health_route() {
    let app = build_router();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/healthz")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("health request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn app_router_exposes_readiness_route() {
    let app = build_router();
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/readyz")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("ready request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
}
