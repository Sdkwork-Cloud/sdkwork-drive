use axum::body::Body;
use http::{Method, Request, StatusCode};
use sdkwork_routes_drive_app_api::build_router;
use tower::util::ServiceExt;

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
