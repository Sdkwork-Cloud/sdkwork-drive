use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_router_drive_backend_api::{build_router, build_router_with_pool_and_iam_policy};
use serde_json::Value;
use sqlx::any::AnyPoolOptions;
use tower::util::ServiceExt;

#[tokio::test]
async fn backend_production_routes_require_signed_context_projection() {
    let app = build_router();

    let health = app
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
    assert_eq!(health.status(), StatusCode::OK);

    let missing_auth = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-a")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        missing_auth,
        StatusCode::UNAUTHORIZED,
        "sdkwork.auth.missing_auth_token",
    )
    .await;

    let missing_access = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-a")
                .header("authorization", "Bearer auth-token")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        missing_access,
        StatusCode::UNAUTHORIZED,
        "sdkwork.auth.missing_access_token",
    )
    .await;

    let missing_signature = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-a")
                .header("authorization", "Bearer auth-token")
                .header("access-token", "access-token")
                .header("x-sdkwork-tenant-id", "tenant-a")
                .header("x-sdkwork-user-id", "admin-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        missing_signature,
        StatusCode::UNAUTHORIZED,
        "sdkwork.auth.missing_context_signature",
    )
    .await;
}

#[tokio::test]
async fn backend_development_routes_validate_unsigned_app_context_projection() {
    let app = backend_router_allowing_unsigned_context();

    let tenant_conflict = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-b")
                .header("authorization", "Bearer auth-token")
                .header("access-token", "access-token")
                .header("x-sdkwork-tenant-id", "tenant-a")
                .header("x-sdkwork-user-id", "user-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        tenant_conflict,
        StatusCode::FORBIDDEN,
        "sdkwork.auth.context_conflict",
    )
    .await;

    let operator_conflict = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/object_sweep")
                .header("authorization", "Bearer auth-token")
                .header("access-token", "access-token")
                .header("x-sdkwork-tenant-id", "tenant-a")
                .header("x-sdkwork-user-id", "admin-001")
                .header("x-sdkwork-actor-id", "admin-001")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"dryRun":true,"limit":1,"operatorId":"admin-002"}"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        operator_conflict,
        StatusCode::FORBIDDEN,
        "sdkwork.auth.context_conflict",
    )
    .await;

    let allowed = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-a")
                .header("authorization", "Bearer auth-token")
                .header("access-token", "access-token")
                .header("x-sdkwork-tenant-id", "tenant-a")
                .header("x-sdkwork-user-id", "admin-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_ne!(allowed.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(allowed.status(), StatusCode::FORBIDDEN);
}

fn backend_router_allowing_unsigned_context() -> axum::Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect_lazy("sqlite::memory:")
        .expect("create in-memory sqlite pool");
    build_router_with_pool_and_iam_policy(
        pool,
        DriveAuthValidationPolicy::allow_unsigned_for_development(),
    )
}

async fn assert_problem(response: axum::response::Response, status: StatusCode, code: &str) {
    assert_eq!(response.status(), status);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("problem body should be readable");
    let problem: Value = serde_json::from_slice(&body).expect("problem body should be json");
    assert_eq!(problem["status"], status.as_u16());
    assert_eq!(problem["code"], code);
    assert!(problem["requestId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
    assert!(problem["traceId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
}
