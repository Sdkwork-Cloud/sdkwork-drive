use async_trait::async_trait;
use sdkwork_drive_product::application::download_service::{
    CreateDownloadUrlCommand, DriveDownloadService, ResolveDownloadTokenCommand,
};
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::storage_object_store::SqlStorageObjectStore;
use sdkwork_drive_product::ports::storage_object_store::{
    DownloadSignCommand, DriveDownloadSigner, SignedDownloadPayload,
};
use sqlx::sqlite::SqlitePoolOptions;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
struct FakeDownloadSigner;

#[async_trait]
impl DriveDownloadSigner for FakeDownloadSigner {
    async fn sign_download(
        &self,
        command: DownloadSignCommand,
    ) -> Result<SignedDownloadPayload, sdkwork_drive_product::DriveProductError> {
        Ok(SignedDownloadPayload {
            method: "GET".to_string(),
            raw_url: format!(
                "https://s3.example.com/{}/{}?X-Amz-Signature=fake",
                command.bucket, command.object_key
            ),
            headers: Default::default(),
            expires_at_epoch_ms: command.expires_at_epoch_ms,
        })
    }
}

#[tokio::test]
async fn download_url_is_short_lived_and_hides_object_key() {
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

    let store = SqlStorageObjectStore::new(pool);
    let signer = FakeDownloadSigner;
    let service = DriveDownloadService::new(store, signer);

    let now_epoch_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be valid")
        .as_millis() as i64;

    let response = service
        .create_download_url(CreateDownloadUrlCommand {
            tenant_id: "tenant-001".to_string(),
            node_id: "node-001".to_string(),
            requested_ttl_seconds: 900,
            request_base_url: "https://drive.example.com".to_string(),
        })
        .await
        .expect("download URL should be generated");

    assert!(
        response.download_url.contains("/download_tokens/"),
        "download url should be opaque"
    );
    assert!(
        !response.download_url.contains("objects/node-001/v1.bin"),
        "download url should not leak object key"
    );
    assert!(
        response.expires_at_epoch_ms <= now_epoch_ms + 300_000 + 5_000,
        "ttl must be short lived and clamped"
    );
}

#[tokio::test]
async fn resolve_download_token_restores_node_and_signs_source_url() {
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

    let store = SqlStorageObjectStore::new(pool);
    let signer = FakeDownloadSigner;
    let service = DriveDownloadService::new(store, signer);

    let created = service
        .create_download_url(CreateDownloadUrlCommand {
            tenant_id: "tenant-001".to_string(),
            node_id: "node-001".to_string(),
            requested_ttl_seconds: 120,
            request_base_url: "https://drive.example.com/app/v3/api/drive".to_string(),
        })
        .await
        .expect("download URL should be generated");

    let token = created
        .download_url
        .rsplit('/')
        .next()
        .expect("token should be present in path")
        .to_string();

    let resolved = service
        .resolve_download_token(ResolveDownloadTokenCommand {
            tenant_id: "tenant-001".to_string(),
            token,
        })
        .await
        .expect("token should be resolved");

    assert_eq!(resolved.node_id, "node-001");
    assert!(resolved
        .signed_source_url
        .contains("objects/node-001/v1.bin"));
}
