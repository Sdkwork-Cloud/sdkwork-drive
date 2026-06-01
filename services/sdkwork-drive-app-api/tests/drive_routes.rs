use axum::body::Body;
use http::{Method, Request, StatusCode};
use sdkwork_drive_app_api::build_router;
use tower::util::ServiceExt;

#[tokio::test]
async fn app_router_exposes_drive_space_and_upload_routes() {
    let app = build_router();

    let spaces_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/drive/spaces")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("spaces request should be handled");
    assert_ne!(spaces_response.status(), StatusCode::NOT_FOUND);

    let upload_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/upload_sessions")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("upload request should be handled");
    assert_ne!(upload_response.status(), StatusCode::NOT_FOUND);
}
