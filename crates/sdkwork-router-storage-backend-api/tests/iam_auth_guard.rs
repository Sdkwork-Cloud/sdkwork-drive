use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_router_storage_backend_api::{build_router, build_router_with_pool_and_iam_policy};
use serde_json::Value;
use sqlx::any::AnyPoolOptions;
use tower::util::ServiceExt;

fn auth_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;auth_level=password"
    )
}

fn admin_auth_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;auth_level=password;permission_scope=drive.storage.admin"
    )
}

fn admin_access_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;environment=prod;deployment_mode=saas;permission_scope=drive.storage.admin"
    )
}

fn access_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;environment=prod;deployment_mode=saas"
    )
}

#[tokio::test]
async fn admin_storage_production_routes_require_valid_dual_tokens() {
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
                .uri("/admin/v3/api/drive/storage/bindings")
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
                .uri("/admin/v3/api/drive/storage/bindings")
                .header(
                    "authorization",
                    format!("Bearer {}", auth_token("tenant-a", "admin-001")),
                )
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

    let invalid_credentials = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/admin/v3/api/drive/storage/bindings")
                .header("authorization", "Bearer opaque-auth-token")
                .header("access-token", "opaque-access-token")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        invalid_credentials,
        StatusCode::UNAUTHORIZED,
        "sdkwork.auth.invalid_credentials",
    )
    .await;
}

#[tokio::test]
async fn admin_storage_routes_validate_token_derived_app_context() {
    let app = admin_storage_router_allowing_unsigned_context();

    let tenant_conflict = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/admin/v3/api/drive/storage/bindings")
                .header(
                    "authorization",
                    format!("Bearer {}", admin_auth_token("tenant-a", "admin-001")),
                )
                .header("access-token", admin_access_token("tenant-a", "admin-001"))
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
                .uri("/admin/v3/api/drive/storage/providers/provider-s3/test")
                .header(
                    "authorization",
                    format!("Bearer {}", admin_auth_token("tenant-a", "admin-001")),
                )
                .header("access-token", admin_access_token("tenant-a", "admin-001"))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"operatorId":"admin-002"}"#))
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

    let missing_permission = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/admin/v3/api/drive/storage/bindings")
                .header(
                    "authorization",
                    format!("Bearer {}", auth_token("tenant-a", "user-001")),
                )
                .header("access-token", access_token("tenant-a", "user-001"))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        missing_permission,
        StatusCode::FORBIDDEN,
        "sdkwork.auth.missing_permission",
    )
    .await;

    let allowed = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/admin/v3/api/drive/storage/bindings")
                .header(
                    "authorization",
                    format!("Bearer {}", admin_auth_token("tenant-a", "admin-001")),
                )
                .header("access-token", admin_access_token("tenant-a", "admin-001"))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_ne!(allowed.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(allowed.status(), StatusCode::FORBIDDEN);
}

fn admin_storage_router_allowing_unsigned_context() -> axum::Router {
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
    if let Some(code_value) = problem.get("code").and_then(Value::as_str) {
        assert_eq!(code_value, code);
        assert!(problem["requestId"]
            .as_str()
            .is_some_and(|value| !value.is_empty()));
        assert!(problem["traceId"]
            .as_str()
            .is_some_and(|value| !value.is_empty()));
        return;
    }

    let detail = problem["detail"].as_str().unwrap_or_default();
    match code {
        "sdkwork.auth.missing_auth_token" => {
            assert!(detail.contains("Authorization") || detail.contains("authorization"));
        }
        "sdkwork.auth.missing_access_token" => {
            assert!(detail.contains("Access-Token") || detail.contains("access"));
        }
        "sdkwork.auth.invalid_credentials" => {
            assert!(
                problem["type"]
                    .as_str()
                    .is_some_and(|value| value.contains("invalid-credentials"))
                    || detail.contains("claim")
                    || detail.contains("credential")
            );
        }
        "sdkwork.auth.context_conflict" => {
            assert!(
                problem["type"]
                    .as_str()
                    .is_some_and(|value| value.contains("forbidden"))
                    || detail.contains("match")
                    || detail.contains("conflict")
            );
        }
        "sdkwork.auth.missing_permission" => {
            assert!(
                problem["type"]
                    .as_str()
                    .is_some_and(|value| value.contains("forbidden"))
                    || detail.contains("permission")
                    || detail.contains("admin")
            );
        }
        other => panic!("unexpected problem code `{other}`: {problem}"),
    }
}
