use axum::body::Body;
use http::{Method, Request, StatusCode};
use sdkwork_drive_admin_api::build_router;
use tower::util::ServiceExt;

#[tokio::test]
async fn backend_router_exposes_storage_provider_and_quota_routes() {
    let app = build_router();

    let storage_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/storage_providers")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("storage provider request should be handled");
    assert_ne!(storage_response.status(), StatusCode::NOT_FOUND);

    let quota_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("quota request should be handled");
    assert_ne!(quota_response.status(), StatusCode::NOT_FOUND);

    let audit_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/audit_events")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("audit events request should be handled");
    assert_ne!(audit_response.status(), StatusCode::NOT_FOUND);

    let maintenance_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/object_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"dryRun": true, "limit": 1, "operatorId": "admin-ops"}"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("maintenance request should be handled");
    assert_ne!(maintenance_response.status(), StatusCode::NOT_FOUND);
}
