use axum::body::Body;
use http::{Method, Request, StatusCode};
use sdkwork_drive_admin_api::build_router;
use tower::util::ServiceExt;

#[tokio::test]
async fn backend_router_exposes_health_route() {
    let app = build_router();
    let response = app
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
