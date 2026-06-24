use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sdkwork_router_drive_backend_api::{build_router, build_router_with_pool_and_iam_policy};
use sdkwork_web_core::{auth_token_jwt, encode_unsigned_test_jwt};
use serde_json::{json, Value};
use sqlx::any::AnyPoolOptions;
use tower::util::ServiceExt;

const TEST_SESSION: &str = "session-1";
const TEST_APP: &str = "appbase";

fn auth_token(tenant: &str, user: &str) -> String {
    auth_token_jwt(tenant, user, TEST_SESSION, TEST_APP)
}

fn access_token(tenant: &str, user: &str) -> String {
    encode_unsigned_test_jwt(json!({
        "token_type": "access",
        "tenant_id": tenant,
        "user_id": user,
        "session_id": TEST_SESSION,
        "app_id": TEST_APP,
        "environment": "prod",
        "deployment_mode": "saas",
        "login_scope": "TENANT",
        "permission_scope": "drive.storage.admin",
    }))
}

#[tokio::test]
async fn backend_production_routes_require_valid_dual_tokens() {
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

    let missing_credentials = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_problem(
        missing_credentials,
        StatusCode::UNAUTHORIZED,
        "sdkwork.auth.missing_access_token",
    )
    .await;

    let missing_access = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas")
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
                .uri("/backend/v3/api/drive/quotas")
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
async fn backend_routes_validate_token_derived_app_context() {
    let app = backend_router_allowing_unsigned_context().await;

    let tenant_conflict = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas")
                .header(
                    "authorization",
                    format!("Bearer {}", auth_token("tenant-a", "user-001")),
                )
                .header("access-token", access_token("tenant-b", "user-001"))
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
                .header(
                    "authorization",
                    format!("Bearer {}", auth_token("tenant-a", "admin-001")),
                )
                .header("access-token", access_token("tenant-a", "admin-001"))
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
                .uri("/backend/v3/api/drive/quotas")
                .header(
                    "authorization",
                    format!("Bearer {}", auth_token("tenant-a", "admin-001")),
                )
                .header("access-token", access_token("tenant-a", "admin-001"))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("protected request should be handled");
    assert_ne!(allowed.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(allowed.status(), StatusCode::FORBIDDEN);
}

async fn backend_router_allowing_unsigned_context() -> axum::Router {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");
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
        other => panic!("unexpected problem code `{other}`: {problem}"),
    }
}
