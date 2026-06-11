use axum::body::{to_bytes, Body};
use http::{Method, Request, StatusCode};
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_open_api::build_router_with_pool;
use sdkwork_drive_product::drive_share_token_hash;
use sdkwork_drive_product::infrastructure::sql::install_any_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use tower::util::ServiceExt;

#[tokio::test]
async fn open_share_link_resolves_and_creates_download_url_without_exposing_token_hash() {
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
        ) VALUES ('space-open', 'tenant-open', 'user', 'user-open', 'personal', 'Open', 'active', 1, 'user-open', 'user-open')",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES ('node-open', 'tenant-open', 'space-open', NULL, 'file', 'public.pdf', 'ready', 'active', 1, 'user-open', 'user-open')",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open",
        "s3_compatible",
        "Open MinIO",
        "http://127.0.0.1:9000",
        "us-east-1",
        "bucket-open",
        true,
        "active",
        "user-open",
    )
    .await;
    seed_storage_object_fixture(
        &pool,
        "object-open-v1",
        "tenant-open",
        "node-open",
        1,
        "provider-open",
        "bucket-open",
        "objects/node-open/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-001";
    let token_hash = drive_share_token_hash(token);
    assert_eq!(
        token_hash.len(),
        "sha256:".len() + 64,
        "share link token hash should be a SHA-256 hex digest"
    );
    assert!(token_hash.starts_with("sha256:"));
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open', 'tenant-open', 'node-open', ?1, 'reader', 4102444800000,
            2, 0, 'active', 1, 'user-open', 'user-open'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());

    let resolve_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/open/v3/api/drive/share_links/{token}"))
                .body(Body::empty())
                .expect("request should be built"),
        )
        .await
        .expect("resolve request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::OK);
    let resolve_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(resolve_response.into_body(), usize::MAX)
            .await
            .expect("resolve response body should be read"),
    )
    .expect("resolve response json should be valid");
    assert_eq!(resolve_payload["node"]["id"], "node-open");
    assert_eq!(resolve_payload["node"]["nodeName"], "public.pdf");
    assert!(
        resolve_payload.get("tokenHash").is_none(),
        "public response must not expose token hash"
    );

    let download_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                .expect("request should be built"),
        )
        .await
        .expect("download request should be handled");
    assert_eq!(download_response.status(), StatusCode::CREATED);
    let download_payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(download_response.into_body(), usize::MAX)
            .await
            .expect("download response body should be read"),
    )
    .expect("download response json should be valid");
    assert!(download_payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be a string")
        .contains("http://127.0.0.1:9000/bucket-open/objects/node-open/v1.pdf"));
    assert!(download_payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be a string")
        .contains("X-Amz-Signature="));
    assert_eq!(download_payload["method"], "GET");

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 1);
}

#[tokio::test]
async fn open_share_link_download_reads_object_from_its_bound_provider_when_bucket_is_shared() {
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
        ) VALUES (
            'space-open-shared-provider', 'tenant-open-shared-provider',
            'user', 'user-open-shared-provider', 'personal', 'Open Shared Provider',
            'active', 1, 'user-open-shared-provider', 'user-open-shared-provider'
        )",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'node-open-shared-provider', 'tenant-open-shared-provider',
            'space-open-shared-provider', NULL, 'file', 'shared.pdf',
            'ready', 'active', 1, 'user-open-shared-provider',
            'user-open-shared-provider'
        )",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open-shared-wrong",
        "s3_compatible",
        "Wrong Open Shared Provider",
        "https://wrong-open-shared.example.test",
        "us-east-1",
        "bucket-open-shared",
        true,
        "active",
        "user-open-shared-provider",
    )
    .await;
    seed_storage_provider_fixture(
        &pool,
        "provider-open-shared-bound",
        "s3_compatible",
        "Bound Open Shared Provider",
        "https://bound-open-shared.example.test",
        "us-east-1",
        "bucket-open-shared",
        true,
        "active",
        "user-open-shared-provider",
    )
    .await;
    sqlx::query(
        "UPDATE dr_drive_storage_provider
         SET updated_at='2999-01-01 00:00:00'
         WHERE id='provider-open-shared-wrong'",
    )
    .execute(&pool)
    .await
    .expect("wrong provider should be newest if looked up by bucket");
    seed_storage_object_fixture(
        &pool,
        "object-open-shared-provider-v1",
        "tenant-open-shared-provider",
        "node-open-shared-provider",
        1,
        "provider-open-shared-bound",
        "bucket-open-shared",
        "objects/node-open-shared-provider/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open-shared-provider",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-shared-provider";
    let token_hash = drive_share_token_hash(token);
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-shared-provider', 'tenant-open-shared-provider',
            'node-open-shared-provider', ?1, 'reader', 4102444800000,
            2, 0, 'active', 1, 'user-open-shared-provider',
            'user-open-shared-provider'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool);
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                .expect("request should be built"),
        )
        .await
        .expect("download request should be handled");

    assert_eq!(response.status(), StatusCode::CREATED);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("download response body should be read"),
    )
    .expect("download response json should be valid");
    let download_url = payload["downloadUrl"]
        .as_str()
        .expect("downloadUrl should be a string");
    assert!(
        download_url.starts_with("https://bound-open-shared.example.test/"),
        "download URL must be signed by the object's bound provider: {download_url}"
    );
    assert!(
        !download_url.starts_with("https://wrong-open-shared.example.test/"),
        "bucket lookup must not override the object's bound provider: {download_url}"
    );
}

#[tokio::test]
async fn open_share_link_download_uses_explicit_cloud_s3_provider_kinds_with_s3_signer() {
    for (provider_kind, endpoint_url, region, bucket, token, node_id) in [
        (
            "tencent_cos",
            "https://cos.ap-guangzhou.myqcloud.com",
            "ap-guangzhou",
            "bucket-open-cos",
            "share-token-open-cos",
            "node-open-cos",
        ),
        (
            "huawei_obs",
            "https://obs.cn-north-4.myhuaweicloud.com",
            "cn-north-4",
            "bucket-open-obs",
            "share-token-open-obs",
            "node-open-obs",
        ),
        (
            "volcengine_tos",
            "https://tos-cn-beijing.volces.com",
            "cn-beijing",
            "bucket-open-tos",
            "share-token-open-tos",
            "node-open-tos",
        ),
    ] {
        sqlx::any::install_default_drivers();
        let pool = AnyPoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("sqlite in-memory pool should be created");
        install_any_schema(&pool, DatabaseEngine::Sqlite)
            .await
            .expect("sqlite schema should be installed");

        let tenant_id = format!("tenant-{provider_kind}");
        let space_id = format!("space-{provider_kind}");
        let object_id = format!("object-{provider_kind}");
        let provider_id = format!("provider-{provider_kind}");
        let share_id = format!("share-{provider_kind}");
        let object_key = format!("objects/{node_id}/v1.pdf");
        let token_hash = drive_share_token_hash(token);

        sqlx::query(
            "INSERT INTO dr_drive_space (
                id, tenant_id, owner_subject_type, owner_subject_id, space_type,
                display_name, lifecycle_status, version, created_by, updated_by
            ) VALUES (?1, ?2, 'user', 'user-open-cloud', 'personal',
                'Open Cloud', 'active', 1, 'user-open-cloud', 'user-open-cloud')",
        )
        .bind(&space_id)
        .bind(&tenant_id)
        .execute(&pool)
        .await
        .expect("space should be seeded");
        sqlx::query(
            "INSERT INTO dr_drive_node (
                id, tenant_id, space_id, parent_node_id, node_type, node_name,
                content_state, lifecycle_status, version, created_by, updated_by
            ) VALUES (?1, ?2, ?3, NULL, 'file', 'public.pdf',
                'ready', 'active', 1, 'user-open-cloud', 'user-open-cloud')",
        )
        .bind(node_id)
        .bind(&tenant_id)
        .bind(&space_id)
        .execute(&pool)
        .await
        .expect("node should be seeded");
        seed_storage_provider_fixture(
            &pool,
            &provider_id,
            provider_kind,
            "Open Cloud S3",
            endpoint_url,
            region,
            bucket,
            false,
            "active",
            "user-open-cloud",
        )
        .await;
        seed_storage_object_fixture(
            &pool,
            &object_id,
            &tenant_id,
            node_id,
            1,
            &provider_id,
            bucket,
            &object_key,
            "application/pdf",
            2048,
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "active",
            "user-open-cloud",
        )
        .await
        .expect("storage object should be seeded");
        sqlx::query(
            "INSERT INTO dr_drive_node_share_link (
                id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
                download_limit, download_count, lifecycle_status, version, created_by, updated_by
            ) VALUES (?1, ?2, ?3, ?4, 'reader', 4102444800000,
                2, 0, 'active', 1, 'user-open-cloud', 'user-open-cloud')",
        )
        .bind(&share_id)
        .bind(&tenant_id)
        .bind(node_id)
        .bind(&token_hash)
        .execute(&pool)
        .await
        .expect("share link should be seeded");

        let app = build_router_with_pool(pool);
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri(format!(
                        "/open/v3/api/drive/share_links/{token}/download_url"
                    ))
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                    .expect("request should be built"),
            )
            .await
            .expect("download request should be handled");
        assert_eq!(
            response.status(),
            StatusCode::CREATED,
            "{provider_kind} should be signed through the S3 adapter"
        );
        let payload: serde_json::Value = serde_json::from_slice(
            &to_bytes(response.into_body(), usize::MAX)
                .await
                .expect("response body should be read"),
        )
        .expect("response json should be valid");
        let download_url = payload["downloadUrl"]
            .as_str()
            .expect("downloadUrl should be present");
        assert!(
            download_url.contains("X-Amz-Signature="),
            "{provider_kind} should return an S3 presigned URL: {download_url}"
        );
        assert!(
            download_url.contains(&object_key),
            "{provider_kind} should preserve the Drive object key: {download_url}"
        );
    }
}

#[tokio::test]
async fn open_share_link_download_requires_active_object_store_provider() {
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
        ) VALUES ('space-open-no-provider', 'tenant-open-no-provider', 'user', 'user-open-no-provider', 'personal', 'Open', 'active', 1, 'user-open-no-provider', 'user-open-no-provider')",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES ('node-open-no-provider', 'tenant-open-no-provider', 'space-open-no-provider', NULL, 'file', 'public.pdf', 'ready', 'active', 1, 'user-open-no-provider', 'user-open-no-provider')",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open-disabled",
        "s3_compatible",
        "Disabled Open Provider",
        "http://127.0.0.1:9000",
        "us-east-1",
        "bucket-open-no-provider",
        true,
        "disabled",
        "user-open-no-provider",
    )
    .await;
    seed_storage_object_fixture(
        &pool,
        "object-open-no-provider-v1",
        "tenant-open-no-provider",
        "node-open-no-provider",
        1,
        "provider-open-disabled",
        "bucket-open-no-provider",
        "objects/node-open-no-provider/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open-no-provider",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-no-provider";
    let token_hash = drive_share_token_hash(token);
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-no-provider', 'tenant-open-no-provider', 'node-open-no-provider',
            ?1, 'reader', 4102444800000, 2, 0, 'active', 1, 'user-open-no-provider',
            'user-open-no-provider'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());
    let download_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                .expect("request should be built"),
        )
        .await
        .expect("download request should be handled");

    assert_eq!(download_response.status(), StatusCode::CONFLICT);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(download_response.into_body(), usize::MAX)
            .await
            .expect("download response body should be read"),
    )
    .expect("download response json should be valid");
    assert_eq!(payload["code"], "drive.conflict");
    assert!(payload["detail"]
        .as_str()
        .expect("detail should be a string")
        .contains("active storage provider"));

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open-no-provider'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 0);
}

#[tokio::test]
async fn open_share_link_download_requires_active_storage_object() {
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
        ) VALUES ('space-open-no-object', 'tenant-open-no-object', 'user', 'user-open-no-object', 'personal', 'Open', 'active', 1, 'user-open-no-object', 'user-open-no-object')",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES ('node-open-no-object', 'tenant-open-no-object', 'space-open-no-object', NULL, 'file', 'public.pdf', 'uploading', 'active', 1, 'user-open-no-object', 'user-open-no-object')",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");

    let token = "share-token-open-no-object";
    let token_hash = drive_share_token_hash(token);
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-no-object', 'tenant-open-no-object', 'node-open-no-object',
            ?1, 'reader', 4102444800000, 2, 0, 'active', 1, 'user-open-no-object',
            'user-open-no-object'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());
    let resolve_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/open/v3/api/drive/share_links/{token}"))
                .body(Body::empty())
                .expect("resolve request should be built"),
        )
        .await
        .expect("resolve request should be handled");
    assert_eq!(resolve_response.status(), StatusCode::OK);

    let download_response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                .expect("download request should be built"),
        )
        .await
        .expect("download request should be handled");
    assert_eq!(download_response.status(), StatusCode::NOT_FOUND);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(download_response.into_body(), usize::MAX)
            .await
            .expect("download response body should be read"),
    )
    .expect("download response json should be valid");
    assert_eq!(payload["code"], "drive.not_found");
    assert!(payload["detail"]
        .as_str()
        .expect("detail should be a string")
        .contains("storage object"));

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open-no-object'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 0);
}

#[tokio::test]
async fn open_share_link_download_limit_is_consumed_atomically() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(2)
        .connect("sqlite:file:open_share_download_limit?mode=memory&cache=shared")
        .await
        .expect("sqlite shared in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type,
            display_name, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'space-open-limit', 'tenant-open-limit', 'user', 'user-open-limit',
            'personal', 'Open Limit', 'active', 1, 'user-open-limit', 'user-open-limit'
        )",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'node-open-limit', 'tenant-open-limit', 'space-open-limit', NULL,
            'file', 'limited.pdf', 'ready', 'active', 1, 'user-open-limit',
            'user-open-limit'
        )",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open-limit",
        "s3_compatible",
        "Open Limit MinIO",
        "http://127.0.0.1:9000",
        "us-east-1",
        "bucket-open-limit",
        true,
        "active",
        "user-open-limit",
    )
    .await;
    seed_storage_object_fixture(
        &pool,
        "object-open-limit-v1",
        "tenant-open-limit",
        "node-open-limit",
        1,
        "provider-open-limit",
        "bucket-open-limit",
        "objects/node-open-limit/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open-limit",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-limit";
    let token_hash = drive_share_token_hash(token);
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-limit', 'tenant-open-limit', 'node-open-limit',
            ?1, 'reader', 4102444800000, 1, 0, 'active', 1,
            'user-open-limit', 'user-open-limit'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());
    let first = app.clone().oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!(
                "/open/v3/api/drive/share_links/{token}/download_url"
            ))
            .header("content-type", "application/json")
            .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
            .expect("request should be built"),
    );
    let second = app.oneshot(
        Request::builder()
            .method(Method::POST)
            .uri(format!(
                "/open/v3/api/drive/share_links/{token}/download_url"
            ))
            .header("content-type", "application/json")
            .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
            .expect("request should be built"),
    );

    let (first_response, second_response) = tokio::join!(first, second);
    let mut statuses = [
        first_response
            .expect("first request should be handled")
            .status(),
        second_response
            .expect("second request should be handled")
            .status(),
    ];
    statuses.sort();
    assert_eq!(
        statuses,
        [StatusCode::CREATED, StatusCode::TOO_MANY_REQUESTS]
    );

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open-limit'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 1);
}

#[tokio::test]
async fn open_share_link_download_rejects_ttl_outside_contract_before_consuming_limit() {
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
        ) VALUES (
            'space-open-ttl', 'tenant-open-ttl', 'user', 'user-open-ttl',
            'personal', 'Open TTL', 'active', 1, 'user-open-ttl', 'user-open-ttl'
        )",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'node-open-ttl', 'tenant-open-ttl', 'space-open-ttl', NULL,
            'file', 'ttl.pdf', 'ready', 'active', 1, 'user-open-ttl',
            'user-open-ttl'
        )",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open-ttl",
        "s3_compatible",
        "Open TTL MinIO",
        "http://127.0.0.1:9000",
        "us-east-1",
        "bucket-open-ttl",
        true,
        "active",
        "user-open-ttl",
    )
    .await;
    seed_storage_object_fixture(
        &pool,
        "object-open-ttl-v1",
        "tenant-open-ttl",
        "node-open-ttl",
        1,
        "provider-open-ttl",
        "bucket-open-ttl",
        "objects/node-open-ttl/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open-ttl",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-ttl";
    let token_hash = drive_share_token_hash(token);
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-ttl', 'tenant-open-ttl', 'node-open-ttl',
            ?1, 'reader', 4102444800000, 1, 0, 'active', 1,
            'user-open-ttl', 'user-open-ttl'
        )",
    )
    .bind(&token_hash)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":0}"#))
                .expect("request should be built"),
        )
        .await
        .expect("request should be handled");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");
    assert_eq!(payload["code"], "drive.validation.failed");
    assert!(payload["detail"]
        .as_str()
        .expect("detail should be a string")
        .contains("requestedTtlSeconds"));

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open-ttl'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 0);
}

#[tokio::test]
async fn open_share_link_download_treats_subsecond_remaining_share_ttl_as_expired() {
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
        ) VALUES (
            'space-open-short-ttl', 'tenant-open-short-ttl', 'user', 'user-open-short-ttl',
            'personal', 'Open Short TTL', 'active', 1, 'user-open-short-ttl', 'user-open-short-ttl'
        )",
    )
    .execute(&pool)
    .await
    .expect("space should be seeded");
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'node-open-short-ttl', 'tenant-open-short-ttl', 'space-open-short-ttl', NULL,
            'file', 'short-ttl.pdf', 'ready', 'active', 1, 'user-open-short-ttl',
            'user-open-short-ttl'
        )",
    )
    .execute(&pool)
    .await
    .expect("node should be seeded");
    seed_storage_provider_fixture(
        &pool,
        "provider-open-short-ttl",
        "s3_compatible",
        "Open Short TTL MinIO",
        "http://127.0.0.1:9000",
        "us-east-1",
        "bucket-open-short-ttl",
        true,
        "active",
        "user-open-short-ttl",
    )
    .await;
    seed_storage_object_fixture(
        &pool,
        "object-open-short-ttl-v1",
        "tenant-open-short-ttl",
        "node-open-short-ttl",
        1,
        "provider-open-short-ttl",
        "bucket-open-short-ttl",
        "objects/node-open-short-ttl/v1.pdf",
        "application/pdf",
        2048,
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "active",
        "user-open-short-ttl",
    )
    .await
    .expect("storage object should be seeded");

    let token = "share-token-open-short-ttl";
    let token_hash = drive_share_token_hash(token);
    let expires_at_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system time should be after unix epoch")
        .as_millis() as i64
        + 500;
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            'share-open-short-ttl', 'tenant-open-short-ttl', 'node-open-short-ttl',
            ?1, 'reader', ?2, 1, 0, 'active', 1,
            'user-open-short-ttl', 'user-open-short-ttl'
        )",
    )
    .bind(&token_hash)
    .bind(expires_at_epoch_ms)
    .execute(&pool)
    .await
    .expect("share link should be seeded");

    let app = build_router_with_pool(pool.clone());
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!(
                    "/open/v3/api/drive/share_links/{token}/download_url"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"requestedTtlSeconds":120}"#))
                .expect("request should be built"),
        )
        .await
        .expect("request should be handled");

    assert_eq!(response.status(), StatusCode::GONE);
    let payload: serde_json::Value = serde_json::from_slice(
        &to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be read"),
    )
    .expect("response json should be valid");
    assert_eq!(payload["code"], "drive.share_link.expired");

    let download_count: i64 = sqlx::query_scalar(
        "SELECT download_count FROM dr_drive_node_share_link WHERE id='share-open-short-ttl'",
    )
    .fetch_one(&pool)
    .await
    .expect("download count should be readable");
    assert_eq!(download_count, 0);
}

#[allow(clippy::too_many_arguments)]
async fn seed_storage_provider_fixture(
    pool: &AnyPool,
    provider_id: &str,
    provider_kind: &str,
    provider_name: &str,
    endpoint_url: &str,
    region: &str,
    bucket: &str,
    path_style: bool,
    status: &str,
    actor_id: &str,
) {
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, region, bucket, path_style,
            strict_tls, credential_ref, server_side_encryption_mode, default_storage_class,
            status, version, created_by, updated_by
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
            'plain:test-access:test-secret', NULL, NULL, ?9, 1, ?10, ?10
        )",
    )
    .bind(provider_id)
    .bind(provider_kind)
    .bind(provider_name)
    .bind(endpoint_url)
    .bind(region)
    .bind(bucket)
    .bind(path_style)
    .bind(
        !endpoint_url
            .trim()
            .to_ascii_lowercase()
            .starts_with("http://"),
    )
    .bind(status)
    .bind(actor_id)
    .execute(pool)
    .await
    .expect("storage provider should be seeded");
}

#[allow(clippy::too_many_arguments)]
async fn seed_storage_object_fixture(
    pool: &AnyPool,
    object_id: &str,
    tenant_id: &str,
    node_id: &str,
    version_no: i64,
    provider_id: &str,
    bucket: &str,
    object_key: &str,
    content_type: &str,
    content_length: i64,
    checksum_sha256_hex: &str,
    lifecycle_status: &str,
    actor_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket,
            object_key, content_type, content_length, checksum_sha256_hex,
            lifecycle_status, created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
    )
    .bind(object_id)
    .bind(tenant_id)
    .bind(node_id)
    .bind(version_no)
    .bind(provider_id)
    .bind(bucket)
    .bind(object_key)
    .bind(content_type)
    .bind(content_length)
    .bind(checksum_sha256_hex)
    .bind(lifecycle_status)
    .bind(actor_id)
    .execute(pool)
    .await?;
    Ok(())
}
