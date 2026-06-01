use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_app_api::build_router_with_sqlite_pool;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sqlx::sqlite::SqlitePoolOptions;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::util::ServiceExt;

#[tokio::test]
async fn create_space_route_persists_space_with_special_type() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let request_body = r#"{
        "id":"space-kb-001",
        "tenantId":"tenant-001",
        "ownerSubjectType":"user",
        "ownerSubjectId":"user-001",
        "displayName":"Knowledge Space",
        "spaceType":"knowledge_base",
        "operatorId":"user-001"
    }"#;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/spaces")
                .header("content-type", "application/json")
                .body(Body::from(request_body))
                .expect("request should be built"),
        )
        .await
        .expect("create space request should be handled");

    assert_eq!(response.status(), StatusCode::CREATED);
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM drive_space WHERE id=?1 AND space_type='knowledge_base'",
    )
    .bind("space-kb-001")
    .fetch_one(&pool)
    .await
    .expect("space should be persisted");
    assert_eq!(count, 1);
}

#[tokio::test]
async fn create_upload_session_route_is_idempotent() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-001")
    .bind("tenant-001")
    .bind("user")
    .bind("user-001")
    .bind("personal")
    .bind("Main")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed space should succeed");

    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, 'ready', 'active', 1, ?6, ?7)",
    )
    .bind("node-001")
    .bind("tenant-001")
    .bind("space-001")
    .bind("file")
    .bind("v1.bin")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed node should succeed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let first_body = r#"{
        "sessionId":"upload-session-001",
        "tenantId":"tenant-001",
        "spaceId":"space-001",
        "nodeId":"node-001",
        "bucket":"bucket-001",
        "objectKey":"objects/node-001/v1.bin",
        "idempotencyKey":"idem-abc",
        "operatorId":"user-001",
        "expiresAtEpochMs":1800000000000
    }"#;
    let second_body = r#"{
        "sessionId":"upload-session-002",
        "tenantId":"tenant-001",
        "spaceId":"space-001",
        "nodeId":"node-001",
        "bucket":"bucket-001",
        "objectKey":"objects/node-001/v1.bin",
        "idempotencyKey":"idem-abc",
        "operatorId":"user-001",
        "expiresAtEpochMs":1800000005000
    }"#;

    let first_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/upload_sessions")
                .header("content-type", "application/json")
                .body(Body::from(first_body))
                .expect("first request should be built"),
        )
        .await
        .expect("first upload session request should be handled");
    assert_eq!(first_response.status(), StatusCode::CREATED);
    let first_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(first_response.into_body(), usize::MAX)
            .await
            .expect("first response body should be read"),
    )
    .expect("first response json should be valid");

    let second_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/upload_sessions")
                .header("content-type", "application/json")
                .body(Body::from(second_body))
                .expect("second request should be built"),
        )
        .await
        .expect("second upload session request should be handled");
    assert_eq!(second_response.status(), StatusCode::CREATED);
    let second_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(second_response.into_body(), usize::MAX)
            .await
            .expect("second response body should be read"),
    )
    .expect("second response json should be valid");

    assert_eq!(first_payload["id"], second_payload["id"]);
}

#[tokio::test]
async fn list_spaces_route_returns_tenant_scoped_items() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-001")
    .bind("tenant-001")
    .bind("user")
    .bind("user-001")
    .bind("personal")
    .bind("Main")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed first space should succeed");
    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-002")
    .bind("tenant-001")
    .bind("user")
    .bind("user-002")
    .bind("knowledge_base")
    .bind("Knowledge")
    .bind("user-002")
    .bind("user-002")
    .execute(&pool)
    .await
    .expect("seed second space should succeed");
    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-003")
    .bind("tenant-002")
    .bind("user")
    .bind("user-003")
    .bind("team")
    .bind("Other")
    .bind("user-003")
    .bind("user-003")
    .execute(&pool)
    .await
    .expect("seed third space should succeed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/drive/spaces?tenantId=tenant-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list spaces request should be handled");

    assert_eq!(response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");
    assert_eq!(
        payload["items"]
            .as_array()
            .expect("items should be array")
            .len(),
        2
    );
}

#[tokio::test]
async fn create_download_url_and_resolve_token_redirects_to_signed_source() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-001")
    .bind("tenant-001")
    .bind("user")
    .bind("user-001")
    .bind("personal")
    .bind("Main")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed space should succeed");
    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, 'ready', 'active', 1, ?6, ?7)",
    )
    .bind("node-001")
    .bind("tenant-001")
    .bind("space-001")
    .bind("file")
    .bind("v1.bin")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed node should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
    )
    .bind("obj-001")
    .bind("tenant-001")
    .bind("node-001")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-001/v1.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:fake")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed storage object should succeed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/download_urls")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "tenantId":"tenant-001",
                        "nodeId":"node-001",
                        "requestedTtlSeconds":120
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create download url request should be handled");
    assert_eq!(response.status(), StatusCode::CREATED);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");

    let url = payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be present");
    let token = url
        .rsplit('/')
        .next()
        .expect("token should be encoded in path segment");
    let resolve_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/app/v3/api/drive/download_tokens/{token}?tenantId=tenant-001"
                ))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve token request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::TEMPORARY_REDIRECT);
    let location = resolve_response
        .headers()
        .get("location")
        .and_then(|value| value.to_str().ok())
        .expect("location header should be present");
    assert!(location.contains("/bucket-001/objects/node-001/v1.bin"));
}

#[tokio::test]
async fn resolve_download_token_uses_active_s3_provider_configuration_when_present() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-001")
    .bind("tenant-001")
    .bind("user")
    .bind("user-001")
    .bind("personal")
    .bind("Main")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed space should succeed");
    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, 'ready', 'active', 1, ?6, ?7)",
    )
    .bind("node-001")
    .bind("tenant-001")
    .bind("space-001")
    .bind("file")
    .bind("v1.bin")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed node should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
    )
    .bind("obj-001")
    .bind("tenant-001")
    .bind("node-001")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-001/v1.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:fake")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed storage object should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_provider (
            id, provider_kind, name, endpoint_url, region, bucket, path_style,
            credential_ref, server_side_encryption_mode, default_storage_class,
            status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'active', 1, ?11, ?12)",
    )
    .bind("provider-s3-001")
    .bind("s3_compatible")
    .bind("Primary S3")
    .bind("https://s3.custom.local")
    .bind("us-east-1")
    .bind("bucket-001")
    .bind(true)
    .bind("plain:test-access-key:test-secret-key")
    .bind("AES256")
    .bind("STANDARD")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed storage provider should succeed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/download_urls")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "tenantId":"tenant-001",
                        "nodeId":"node-001",
                        "requestedTtlSeconds":120
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create download url request should be handled");
    assert_eq!(response.status(), StatusCode::CREATED);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");

    let url = payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be present");
    let token = url
        .rsplit('/')
        .next()
        .expect("token should be encoded in path segment");
    let resolve_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/app/v3/api/drive/download_tokens/{token}?tenantId=tenant-001"
                ))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve token request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::TEMPORARY_REDIRECT);
    let location = resolve_response
        .headers()
        .get("location")
        .and_then(|value| value.to_str().ok())
        .expect("location header should be present");
    assert!(location.starts_with("https://s3.custom.local/"));
    assert!(location.contains("/bucket-001/objects/node-001/v1.bin"));
    assert!(location.contains("X-Amz-Signature"));
}

#[tokio::test]
async fn resolve_download_token_uses_aliyun_oss_provider_kind_with_s3_signer() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 1, ?7, ?8)",
    )
    .bind("space-oss-001")
    .bind("tenant-001")
    .bind("user")
    .bind("user-001")
    .bind("personal")
    .bind("Main")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed space should succeed");
    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, 'ready', 'active', 1, ?6, ?7)",
    )
    .bind("node-oss-001")
    .bind("tenant-001")
    .bind("space-oss-001")
    .bind("file")
    .bind("v1.bin")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed node should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
    )
    .bind("obj-oss-001")
    .bind("tenant-001")
    .bind("node-oss-001")
    .bind(1_i64)
    .bind("bucket-oss-001")
    .bind("objects/node-oss-001/v1.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:fake")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed storage object should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_provider (
            id, provider_kind, name, endpoint_url, region, bucket, path_style,
            credential_ref, server_side_encryption_mode, default_storage_class,
            status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'active', 1, ?11, ?12)",
    )
    .bind("provider-oss-001")
    .bind("aliyun_oss")
    .bind("Aliyun OSS")
    .bind("https://oss-cn-hangzhou.aliyuncs.com")
    .bind("cn-hangzhou")
    .bind("bucket-oss-001")
    .bind(false)
    .bind("plain:test-access-key:test-secret-key")
    .bind("AES256")
    .bind("STANDARD")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed storage provider should succeed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/download_urls")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "tenantId":"tenant-001",
                        "nodeId":"node-oss-001",
                        "requestedTtlSeconds":120
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create download url request should be handled");
    assert_eq!(response.status(), StatusCode::CREATED);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");

    let url = payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be present");
    let token = url
        .rsplit('/')
        .next()
        .expect("token should be encoded in path segment");
    let resolve_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/app/v3/api/drive/download_tokens/{token}?tenantId=tenant-001"
                ))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve token request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::TEMPORARY_REDIRECT);
    let location = resolve_response
        .headers()
        .get("location")
        .and_then(|value| value.to_str().ok())
        .expect("location header should be present");
    assert!(location.contains("X-Amz-Signature"));
    assert!(location.contains("objects/node-oss-001/v1.bin"));
}

#[tokio::test]
async fn resolve_expired_download_token_returns_gone() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    let now_epoch_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be valid")
        .as_millis() as i64;
    let token = build_download_token("node-001", now_epoch_ms - 1_000);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/app/v3/api/drive/download_tokens/{token}?tenantId=tenant-001"
                ))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("expired token request should be handled");
    assert_eq!(response.status(), StatusCode::GONE);
}

fn build_download_token(node_id: &str, expires_at_epoch_ms: i64) -> String {
    format!("dlv1_{}_{}", hex_encode(node_id), expires_at_epoch_ms)
}

fn hex_encode(value: &str) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}
