use std::sync::{Arc, Mutex};

use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_app_api::build_router_with_sqlite_pool;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sqlx::sqlite::SqlitePoolOptions;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::util::ServiceExt;
use tracing::subscriber::set_default;
use tracing_subscriber::fmt::MakeWriter;

struct CapturedWriter {
    buffer: Arc<Mutex<Vec<u8>>>,
}

impl std::io::Write for CapturedWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let mut guard = self
            .buffer
            .lock()
            .expect("captured writer mutex should not be poisoned");
        guard.extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

#[derive(Clone)]
struct CapturedWriterFactory {
    buffer: Arc<Mutex<Vec<u8>>>,
}

impl<'a> MakeWriter<'a> for CapturedWriterFactory {
    type Writer = CapturedWriter;

    fn make_writer(&'a self) -> Self::Writer {
        CapturedWriter {
            buffer: Arc::clone(&self.buffer),
        }
    }
}

fn install_capture_subscriber() -> (tracing::subscriber::DefaultGuard, Arc<Mutex<Vec<u8>>>) {
    let buffer = Arc::new(Mutex::new(Vec::new()));
    let subscriber = tracing_subscriber::fmt()
        .with_ansi(false)
        .with_writer(CapturedWriterFactory {
            buffer: Arc::clone(&buffer),
        })
        .without_time()
        .finish();
    (set_default(subscriber), buffer)
}

fn buffer_to_string(buffer: &Arc<Mutex<Vec<u8>>>) -> String {
    String::from_utf8(
        buffer
            .lock()
            .expect("captured buffer mutex should not be poisoned")
            .clone(),
    )
    .expect("captured log buffer should be valid utf8")
}

#[tokio::test]
async fn app_routes_emit_standardized_observability_events() {
    let (guard, log_buffer) = install_capture_subscriber();

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let create_space_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/spaces")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "id":"space-obs-001",
                        "tenantId":"tenant-001",
                        "ownerSubjectType":"user",
                        "ownerSubjectId":"user-001",
                        "displayName":"Obs Space",
                        "spaceType":"personal",
                        "operatorId":"user-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create space request should be handled");
    assert_eq!(create_space_response.status(), StatusCode::CREATED);
    let _ = to_bytes(create_space_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, 'file', ?4, 'ready', 'active', 1, ?5, ?6)",
    )
    .bind("node-obs-001")
    .bind("tenant-001")
    .bind("space-obs-001")
    .bind("node-obs-001.bin")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed node should succeed");

    let upload_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/upload_sessions")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "sessionId":"upload-obs-001",
                        "tenantId":"tenant-001",
                        "spaceId":"space-obs-001",
                        "nodeId":"node-obs-001",
                        "bucket":"bucket-001",
                        "objectKey":"objects/node-obs-001.bin",
                        "idempotencyKey":"idem-obs-001",
                        "operatorId":"user-001",
                        "expiresAtEpochMs":1800000000000
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create upload session request should be handled");
    assert_eq!(upload_response.status(), StatusCode::CREATED);
    let _ = to_bytes(upload_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
    )
    .bind("obj-obs-001")
    .bind("tenant-001")
    .bind("node-obs-001")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-obs-001.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:obs")
    .bind("user-001")
    .bind("user-001")
    .execute(&pool)
    .await
    .expect("seed storage object should succeed");

    let download_url_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/download_urls")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "tenantId":"tenant-001",
                        "nodeId":"node-obs-001",
                        "requestedTtlSeconds":120
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create download url request should be handled");
    assert_eq!(download_url_response.status(), StatusCode::CREATED);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(download_url_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    let token = payload["downloadUrl"]
        .as_str()
        .expect("download url should exist")
        .rsplit('/')
        .next()
        .expect("download token should exist")
        .to_string();

    let list_spaces_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/app/v3/api/drive/spaces?tenantId=tenant-001&ownerSubjectType=user&ownerSubjectId=user-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list spaces request should be handled");
    assert_eq!(list_spaces_response.status(), StatusCode::OK);
    let _ = to_bytes(list_spaces_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    let resolve_response = app
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
        .expect("resolve token request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::TEMPORARY_REDIRECT);
    let _ = to_bytes(resolve_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    drop(guard);
    let logs = buffer_to_string(&log_buffer);
    for event_name in [
        "drive.app.spaces.create",
        "drive.app.upload_sessions.create",
        "drive.app.download_urls.create",
        "drive.app.spaces.list",
        "drive.app.download_tokens.resolve",
    ] {
        assert!(
            logs.contains(&format!("event=\"{event_name}\"")),
            "expected observability event {event_name}, got:\n{logs}"
        );
    }
    for expected_field in [
        "INFO sdkwork.drive:",
        "result=\"ok\"",
        "filter_has_owner_subject_type=true",
        "filter_has_owner_subject_id=true",
        "method=\"GET\"",
    ] {
        assert!(
            logs.contains(expected_field),
            "expected field {expected_field} in logs, got:\n{logs}"
        );
    }
}

#[tokio::test]
async fn app_route_errors_emit_standardized_observability_events() {
    let (guard, log_buffer) = install_capture_subscriber();

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    let create_space_error_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/drive/spaces")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "id":"space-obs-err-001",
                        "tenantId":"tenant-001",
                        "ownerSubjectType":"user",
                        "ownerSubjectId":"user-001",
                        "displayName":"Obs Space",
                        "spaceType":"invalid-space-type",
                        "operatorId":"user-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create space error request should be handled");
    assert_eq!(
        create_space_error_response.status(),
        StatusCode::BAD_REQUEST
    );
    let _ = to_bytes(create_space_error_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    let resolve_error_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/app/v3/api/drive/download_tokens/{}?tenantId=tenant-001",
                    build_download_token("node-not-found-001", now_epoch_ms() + 120_000)
                ))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("resolve token error request should be handled");
    assert_eq!(resolve_error_response.status(), StatusCode::NOT_FOUND);
    let _ = to_bytes(resolve_error_response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");

    drop(guard);
    let logs = buffer_to_string(&log_buffer);
    for expected_field in [
        "event=\"drive.app.spaces.create\"",
        "result=\"err\"",
        "error_kind=\"validation\"",
        "input_space_type=\"invalid-space-type\"",
        "event=\"drive.app.download_tokens.resolve\"",
        "error_kind=\"not_found\"",
        "method=\"GET\"",
    ] {
        assert!(
            logs.contains(expected_field),
            "expected field {expected_field} in app error logs, got:\n{logs}"
        );
    }
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

fn now_epoch_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be valid")
        .as_millis() as i64
}
