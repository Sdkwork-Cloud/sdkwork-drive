use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_admin_api::build_router_with_sqlite_pool;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sqlx::sqlite::SqlitePoolOptions;
use tower::util::ServiceExt;

#[tokio::test]
async fn create_storage_provider_and_list_routes_use_real_data() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/storage_providers")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "id":"provider-001",
                        "providerKind":"s3_compatible",
                        "name":"Primary S3",
                        "endpointUrl":"https://s3.example.com",
                        "region":"us-east-1",
                        "bucket":"drive-bucket",
                        "pathStyle":true,
                        "serverSideEncryptionMode":"AES256",
                        "defaultStorageClass":"STANDARD",
                        "status":"active",
                        "operatorId":"admin-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create storage provider request should be handled");
    assert_eq!(create_response.status(), StatusCode::CREATED);

    let list_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/storage_providers")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list storage providers request should be handled");
    assert_eq!(list_response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(list_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(
        payload["items"]
            .as_array()
            .expect("items should be an array")
            .len(),
        1
    );
    assert_eq!(
        payload["items"][0]["providerKind"].as_str(),
        Some("s3_compatible")
    );
    assert_eq!(payload["items"][0]["name"].as_str(), Some("Primary S3"));
    assert_eq!(payload["items"][0]["region"].as_str(), Some("us-east-1"));
    assert_eq!(payload["items"][0]["pathStyle"].as_bool(), Some(true));
    assert_eq!(
        payload["items"][0]["serverSideEncryptionMode"].as_str(),
        Some("AES256")
    );
    assert_eq!(
        payload["items"][0]["defaultStorageClass"].as_str(),
        Some("STANDARD")
    );
}

#[tokio::test]
async fn update_test_and_delete_storage_provider_routes_emit_audit_events() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/storage_providers")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "id":"provider-001",
                        "providerKind":"s3_compatible",
                        "name":"Primary S3",
                        "endpointUrl":"https://s3.example.com",
                        "region":"us-east-1",
                        "bucket":"drive-bucket",
                        "pathStyle":true,
                        "status":"active",
                        "operatorId":"admin-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("create storage provider request should be handled");
    assert_eq!(create_response.status(), StatusCode::CREATED);

    let update_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/backend/v3/api/drive/storage_providers/provider-001")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "name":"Primary S3 Updated",
                        "endpointUrl":"https://s3-updated.example.com",
                        "region":"us-west-2",
                        "bucket":"drive-bucket-updated",
                        "pathStyle":false,
                        "serverSideEncryptionMode":"aws:kms",
                        "defaultStorageClass":"INTELLIGENT_TIERING",
                        "status":"disabled",
                        "operatorId":"admin-002"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("update storage provider request should be handled");
    assert_eq!(update_response.status(), StatusCode::OK);

    let test_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/storage_providers/provider-001/test")
                .header("content-type", "application/json")
                .body(Body::from(r#"{ "operatorId":"admin-003" }"#))
                .expect("request should be built"),
        )
        .await
        .expect("test storage provider request should be handled");
    assert_eq!(test_response.status(), StatusCode::OK);
    let tested_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(test_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(tested_payload["reachable"].as_bool(), Some(true));

    let delete_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri("/backend/v3/api/drive/storage_providers/provider-001?operatorId=admin-004")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("delete storage provider request should be handled");
    assert_eq!(delete_response.status(), StatusCode::OK);

    let list_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/storage_providers")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list storage providers request should be handled");
    assert_eq!(list_response.status(), StatusCode::OK);
    let listed_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(list_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(
        listed_payload["items"]
            .as_array()
            .expect("items should be an array")
            .len(),
        0
    );

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_audit_event
         WHERE resource_type='storage_provider'
           AND resource_id=?1",
    )
    .bind("provider-001")
    .fetch_one(&pool)
    .await
    .expect("audit rows should be queryable");
    assert_eq!(audit_count, 4);
}

#[tokio::test]
async fn list_spaces_admin_route_returns_tenant_filtered_result() {
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
    .bind("admin-001")
    .bind("admin-001")
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
    .bind("tenant-002")
    .bind("user")
    .bind("user-002")
    .bind("team")
    .bind("Other")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed second space should succeed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/spaces?tenantId=tenant-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list spaces request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(
        payload["items"]
            .as_array()
            .expect("items should be an array")
            .len(),
        1
    );
}

#[tokio::test]
async fn list_quotas_route_returns_usage_aggregated_from_storage_objects() {
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
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed space should succeed");

    for node_id in ["node-001", "node-002"] {
        sqlx::query(
            "INSERT INTO drive_node (
                id, tenant_id, space_id, parent_node_id, node_type, node_name,
                content_state, lifecycle_status, version, created_by, updated_by
            ) VALUES (?1, ?2, ?3, NULL, 'file', ?4, 'ready', 'active', 1, ?5, ?6)",
        )
        .bind(node_id)
        .bind("tenant-001")
        .bind("space-001")
        .bind(format!("{node_id}.bin"))
        .bind("admin-001")
        .bind("admin-001")
        .execute(&pool)
        .await
        .expect("seed node should succeed");
    }

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
    .bind("objects/node-001/a.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:1")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed first object should succeed");
    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
    )
    .bind("obj-002")
    .bind("tenant-001")
    .bind("node-002")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-002/b.bin")
    .bind("application/octet-stream")
    .bind(256_i64)
    .bind("sha256:2")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("seed second object should succeed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/quotas?tenantId=tenant-001")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list quotas request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["totalBytes"].as_i64(), Some(384));
    assert_eq!(payload["objectCount"].as_i64(), Some(2));
}

#[tokio::test]
async fn list_audit_events_route_supports_filters_and_pagination() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    for (tenant_id, action, resource_id, operator_id, request_id, trace_id) in [
        (
            "tenant-001",
            "storage_provider.created",
            "provider-001",
            "admin-001",
            "request-001",
            "trace-001",
        ),
        (
            "tenant-001",
            "storage_provider.tested",
            "provider-001",
            "admin-002",
            "request-002",
            "trace-002",
        ),
        (
            "tenant-002",
            "storage_provider.created",
            "provider-002",
            "admin-003",
            "request-003",
            "trace-003",
        ),
    ] {
        sqlx::query(
            "INSERT INTO drive_audit_event (
                tenant_id, action, resource_type, resource_id,
                operator_id, request_id, trace_id
            ) VALUES (?1, ?2, 'storage_provider', ?3, ?4, ?5, ?6)",
        )
        .bind(tenant_id)
        .bind(action)
        .bind(resource_id)
        .bind(operator_id)
        .bind(request_id)
        .bind(trace_id)
        .execute(&pool)
        .await
        .expect("seed audit event should succeed");
    }

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/audit_events?tenantId=tenant-001&resourceType=storage_provider&page=1&pageSize=1")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list audit events request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["page"].as_u64(), Some(1));
    assert_eq!(payload["pageSize"].as_u64(), Some(1));
    assert_eq!(payload["total"].as_i64(), Some(2));
    assert_eq!(
        payload["items"]
            .as_array()
            .expect("items should be an array")
            .len(),
        1
    );
}

#[tokio::test]
async fn list_audit_events_route_supports_request_and_trace_filters() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    for (tenant_id, action, resource_id, operator_id, request_id, trace_id) in [
        (
            "tenant-001",
            "storage_provider.created",
            "provider-001",
            "admin-001",
            "request-001",
            "trace-001",
        ),
        (
            "tenant-001",
            "storage_provider.tested",
            "provider-001",
            "admin-002",
            "request-002",
            "trace-002",
        ),
        (
            "tenant-001",
            "storage_provider.created",
            "provider-003",
            "admin-003",
            "request-002",
            "trace-003",
        ),
    ] {
        sqlx::query(
            "INSERT INTO drive_audit_event (
                tenant_id, action, resource_type, resource_id,
                operator_id, request_id, trace_id
            ) VALUES (?1, ?2, 'storage_provider', ?3, ?4, ?5, ?6)",
        )
        .bind(tenant_id)
        .bind(action)
        .bind(resource_id)
        .bind(operator_id)
        .bind(request_id)
        .bind(trace_id)
        .execute(&pool)
        .await
        .expect("seed audit event should succeed");
    }

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/audit_events?tenantId=tenant-001&resourceType=storage_provider&requestId=request-002&traceId=trace-002&page=1&pageSize=10")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list audit events request should be handled");
    assert_eq!(response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["total"].as_i64(), Some(1));
    let items = payload["items"]
        .as_array()
        .expect("items should be an array");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["action"].as_str(), Some("storage_provider.tested"));
    assert_eq!(items[0]["requestId"].as_str(), Some("request-002"));
    assert_eq!(items[0]["traceId"].as_str(), Some("trace-002"));
}

#[tokio::test]
async fn list_audit_events_route_rejects_invalid_identifier_filters() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    for (query, expected_detail) in [
        (
            "/backend/v3/api/drive/audit_events?action=storage%20provider.created&page=1&pageSize=10",
            "action contains invalid characters",
        ),
        (
            "/backend/v3/api/drive/audit_events?resourceId=provider%2F001&page=1&pageSize=10",
            "resource_id contains invalid characters",
        ),
        (
            "/backend/v3/api/drive/audit_events?requestId=request%20id&page=1&pageSize=10",
            "request_id contains invalid characters",
        ),
        (
            "/backend/v3/api/drive/audit_events?traceId=trace%20id&page=1&pageSize=10",
            "trace_id contains invalid characters",
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri(query)
                    .body(Body::empty())
                    .expect("request should be built"),
            )
            .await
            .expect("invalid audit events query request should be handled");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let payload: serde_json::Value = serde_json::from_slice(
            &to_bytes(response.into_body(), usize::MAX)
                .await
                .expect("response body should be readable"),
        )
        .expect("response body should be valid json");
        assert_eq!(payload["code"].as_str(), Some("drive.validation.failed"));
        assert!(
            payload["detail"]
                .as_str()
                .is_some_and(|detail| detail.contains(expected_detail)),
            "unexpected detail for query {}: {}",
            query,
            payload["detail"]
        );
    }
}

#[tokio::test]
async fn maintenance_routes_sweep_objects_and_upload_sessions_and_emit_audit_events() {
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
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("space should be inserted");

    sqlx::query(
        "INSERT INTO drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, NULL, 'file', ?4, 'ready', 'active', 1, ?5, ?6)",
    )
    .bind("node-001")
    .bind("tenant-001")
    .bind("space-001")
    .bind("node-001.bin")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("node should be inserted");

    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'deleted', ?10, ?11)",
    )
    .bind("obj-001")
    .bind("tenant-001")
    .bind("node-001")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-001.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:1")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("deleted storage object should be inserted");

    sqlx::query(
        "INSERT INTO drive_upload_session (
            id, tenant_id, space_id, node_id, bucket, object_key,
            idempotency_key, state, expires_at_epoch_ms, version, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'created', ?8, 1, ?9, ?10)",
    )
    .bind("session-001")
    .bind("tenant-001")
    .bind("space-001")
    .bind("node-001")
    .bind("bucket-001")
    .bind("objects/node-001.bin")
    .bind("idem-001")
    .bind(1_700_000_000_000_i64)
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("upload session should be inserted");

    let app = build_router_with_sqlite_pool(pool.clone());
    let object_sweep_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/object_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "dryRun": false,
                        "limit": 100,
                        "operatorId": "admin-ops",
                        "requestId": "request-001",
                        "traceId": "trace-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("object sweep request should be handled");
    assert_eq!(object_sweep_response.status(), StatusCode::OK);
    let object_sweep_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(object_sweep_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(object_sweep_payload["affectedCount"].as_i64(), Some(1));

    let upload_sweep_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/upload_session_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "nowEpochMs": 1800000000000,
                        "dryRun": false,
                        "limit": 100,
                        "operatorId": "admin-ops",
                        "requestId": "request-001",
                        "traceId": "trace-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("upload session sweep request should be handled");
    assert_eq!(upload_sweep_response.status(), StatusCode::OK);
    let upload_sweep_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(upload_sweep_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(upload_sweep_payload["affectedCount"].as_i64(), Some(1));

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_audit_event
         WHERE resource_type='maintenance'
           AND action IN ('maintenance.object_sweep.executed', 'maintenance.upload_session_sweep.executed')",
    )
    .fetch_one(&pool)
    .await
    .expect("audit rows should be queryable");
    assert_eq!(audit_count, 2);
}

#[tokio::test]
async fn list_maintenance_jobs_route_supports_filters_and_pagination() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    for (job_type, status, operator_id, scanned_count, affected_count, created_at) in [
        (
            "object_sweep",
            "completed",
            "admin-001",
            10_i64,
            5_i64,
            "2026-01-01T00:00:00Z",
        ),
        (
            "upload_session_sweep",
            "completed",
            "admin-001",
            8_i64,
            4_i64,
            "2026-01-01T00:00:01Z",
        ),
        (
            "object_sweep",
            "failed",
            "admin-002",
            3_i64,
            0_i64,
            "2026-01-01T00:00:02Z",
        ),
    ] {
        sqlx::query(
            "INSERT INTO drive_maintenance_job (
                job_type, status, dry_run, scanned_count, affected_count,
                operator_id, request_id, trace_id, error_message,
                started_at, finished_at, created_at
            ) VALUES (?1, ?2, 0, ?3, ?4, ?5, 'request-001', 'trace-001', NULL, ?6, ?6, ?6)",
        )
        .bind(job_type)
        .bind(status)
        .bind(scanned_count)
        .bind(affected_count)
        .bind(operator_id)
        .bind(created_at)
        .execute(&pool)
        .await
        .expect("seed maintenance job should succeed");
    }

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/maintenance/jobs?jobType=object_sweep&status=completed&operatorId=admin-001&page=1&pageSize=1")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list maintenance jobs request should be handled");
    assert_eq!(response.status(), StatusCode::OK);

    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["page"].as_u64(), Some(1));
    assert_eq!(payload["pageSize"].as_u64(), Some(1));
    assert_eq!(payload["total"].as_i64(), Some(1));
    let items = payload["items"]
        .as_array()
        .expect("items should be an array");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["jobType"].as_str(), Some("object_sweep"));
    assert_eq!(items[0]["status"].as_str(), Some("completed"));
    assert_eq!(items[0]["operatorId"].as_str(), Some("admin-001"));
    assert_eq!(items[0]["scannedCount"].as_i64(), Some(10));
    assert_eq!(items[0]["affectedCount"].as_i64(), Some(5));
}

#[tokio::test]
async fn maintenance_routes_record_failed_jobs_with_request_and_trace() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query("DROP TABLE drive_storage_object")
        .execute(&pool)
        .await
        .expect("drop storage object table should succeed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let failed_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/object_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "dryRun": false,
                        "limit": 100,
                        "operatorId": "admin-failed",
                        "requestId": "request-failed-001",
                        "traceId": "trace-failed-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("failed object sweep request should be handled");
    assert_eq!(failed_response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    let failed_list_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/maintenance/jobs?status=failed&operatorId=admin-failed&page=1&pageSize=10")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list failed maintenance jobs request should be handled");
    assert_eq!(failed_list_response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(failed_list_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["total"].as_i64(), Some(1));
    let items = payload["items"]
        .as_array()
        .expect("items should be an array");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["jobType"].as_str(), Some("object_sweep"));
    assert_eq!(items[0]["status"].as_str(), Some("failed"));
    assert_eq!(items[0]["requestId"].as_str(), Some("request-failed-001"));
    assert_eq!(items[0]["traceId"].as_str(), Some("trace-failed-001"));
    assert!(
        items[0]["errorMessage"]
            .as_str()
            .is_some_and(|value| value.contains("count deleted drive_storage_object failed")),
        "unexpected errorMessage: {}",
        items[0]["errorMessage"]
    );

    let failed_audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_audit_event
         WHERE resource_type='maintenance'
           AND action='maintenance.object_sweep.failed'
           AND operator_id='admin-failed'
           AND request_id='request-failed-001'
           AND trace_id='trace-failed-001'",
    )
    .fetch_one(&pool)
    .await
    .expect("failed maintenance audit rows should be queryable");
    assert_eq!(failed_audit_count, 1);
}

#[tokio::test]
async fn maintenance_upload_sweep_failure_records_failed_job_and_audit() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query("DROP TABLE drive_upload_session")
        .execute(&pool)
        .await
        .expect("drop upload session table should succeed");

    let app = build_router_with_sqlite_pool(pool.clone());
    let failed_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/upload_session_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "nowEpochMs": 1800000000000,
                        "dryRun": false,
                        "limit": 100,
                        "operatorId": "admin-upload-failed",
                        "requestId": "request-upload-failed-001",
                        "traceId": "trace-upload-failed-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("failed upload session sweep request should be handled");
    assert_eq!(failed_response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    let failed_list_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/maintenance/jobs?jobType=upload_session_sweep&status=failed&operatorId=admin-upload-failed&page=1&pageSize=10")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("list failed upload maintenance jobs request should be handled");
    assert_eq!(failed_list_response.status(), StatusCode::OK);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(failed_list_response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["total"].as_i64(), Some(1));
    let items = payload["items"]
        .as_array()
        .expect("items should be an array");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["jobType"].as_str(), Some("upload_session_sweep"));
    assert_eq!(items[0]["status"].as_str(), Some("failed"));
    assert_eq!(
        items[0]["requestId"].as_str(),
        Some("request-upload-failed-001")
    );
    assert_eq!(
        items[0]["traceId"].as_str(),
        Some("trace-upload-failed-001")
    );
    assert!(
        items[0]["errorMessage"]
            .as_str()
            .is_some_and(|value| value.contains("count expired drive_upload_session failed")),
        "unexpected errorMessage: {}",
        items[0]["errorMessage"]
    );

    let failed_audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_audit_event
         WHERE resource_type='maintenance'
           AND action='maintenance.upload_session_sweep.failed'
           AND operator_id='admin-upload-failed'
           AND request_id='request-upload-failed-001'
           AND trace_id='trace-upload-failed-001'",
    )
    .fetch_one(&pool)
    .await
    .expect("failed upload maintenance audit rows should be queryable");
    assert_eq!(failed_audit_count, 1);
}

#[tokio::test]
async fn maintenance_routes_reject_invalid_request_id_with_bad_request() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/maintenance/object_sweep")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "dryRun": true,
                        "limit": 1,
                        "operatorId": "admin-ops",
                        "requestId": "request id with spaces"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("invalid requestId sweep request should be handled");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["code"].as_str(), Some("drive.validation.failed"));
    assert!(
        payload["detail"]
            .as_str()
            .is_some_and(|detail| detail.contains("request_id contains invalid characters")),
        "unexpected detail: {}",
        payload["detail"]
    );
}

#[tokio::test]
async fn maintenance_jobs_route_rejects_invalid_operator_id_filter() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/backend/v3/api/drive/maintenance/jobs?operatorId=admin%20ops&page=1&pageSize=10")
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("invalid operatorId filter request should be handled");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(payload["code"].as_str(), Some("drive.validation.failed"));
    assert!(
        payload["detail"]
            .as_str()
            .is_some_and(|detail| detail.contains("operator_id contains invalid characters")),
        "unexpected detail: {}",
        payload["detail"]
    );
}

#[tokio::test]
async fn create_storage_provider_rejects_invalid_provider_kind() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let app = build_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/backend/v3/api/drive/storage_providers")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "id":"provider-bad-kind",
                        "providerKind":"aws-s3",
                        "name":"Bad Provider",
                        "endpointUrl":"https://s3.example.com",
                        "region":"us-east-1",
                        "bucket":"drive-bucket",
                        "pathStyle":true,
                        "status":"active",
                        "operatorId":"admin-001"
                    }"#,
                ))
                .expect("request should be built"),
        )
        .await
        .expect("invalid provider kind request should be handled");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable"),
    )
    .expect("response body should be valid json");
    assert_eq!(
        payload["code"].as_str(),
        Some("drive.validation.provider_kind_invalid")
    );
}
