//! Cross-API E2E: app-api creates a protected share link; open-api resolves it with extraction code.

use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sdkwork_routes_drive_open_api::build_router_with_pool as build_open_router_with_pool;
use sqlx::any::AnyPoolOptions;
use tower::util::ServiceExt;

mod common;

#[tokio::test]
async fn share_link_create_via_app_api_and_resolve_via_open_api_with_access_code() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES ('space-cross-api', 'tenant-cross-api', 'user', 'user-owner', 'personal', 'Cross API', 'active', 1, 'user-owner', 'user-owner')",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES ('node-cross-api', 'tenant-cross-api', 'space-cross-api', NULL, 'file', 'handoff.txt', 'ready', 'active', 1, 'user-owner', 'user-owner')",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");

    let app_api = common::test_router_with_pool(pool.clone());
    let create_response = app_api
        .oneshot(
            common::authed_post_json(
                "/app/v3/api/drive/nodes/node-cross-api/share_links",
                "tenant-cross-api",
                "user-owner",
                "appbase",
                r#"{
                    "id":"share-cross-api",
                    "role":"reader",
                    "accessCode":"cross-e2e-code",
                    "operatorId":"user-owner"
                }"#,
            ),
        )
        .await
        .expect("create share link request should be handled");
    assert_eq!(create_response.status(), StatusCode::CREATED);
    let create_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(create_response.into_body(), usize::MAX)
            .await
            .expect("create response should be read"),
    )
    .expect("create response should be json");
    assert_eq!(create_payload["accessCodeRequired"], true);
    let token = create_payload["token"]
        .as_str()
        .expect("created share token should be returned");

    let open_api = build_open_router_with_pool(pool);
    let denied = open_api
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .header("x-trace-id", "e2e-cross-api-trace-001")
                .uri(format!("/open/v3/api/drive/share_links/{token}"))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve request should be handled");
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
    assert_eq!(
        denied
            .headers()
            .get("x-trace-id")
            .and_then(|value| value.to_str().ok()),
        Some("e2e-cross-api-trace-001")
    );
    let denied_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(denied.into_body(), usize::MAX)
            .await
            .expect("denied response should be read"),
    )
    .expect("denied response should be json");
    assert_eq!(
        denied_payload["traceId"].as_str(),
        Some("e2e-cross-api-trace-001")
    );
    assert_eq!(
        denied_payload["code"].as_str(),
        Some("drive.share_link.access_code_invalid")
    );

    let allowed = open_api
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}?accessCode=cross-e2e-code"
                ))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve request should be handled");
    assert_eq!(allowed.status(), StatusCode::OK);
    let resolve_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(allowed.into_body(), usize::MAX)
            .await
            .expect("resolve response should be read"),
    )
    .expect("resolve response should be json");
    assert_eq!(resolve_payload["accessCodeRequired"], true);
    assert_eq!(resolve_payload["node"]["nodeName"].as_str(), Some("handoff.txt"));
}
