use sdkwork_drive_product::application::upload_service::{
    CreateUploadSessionCommand, DriveUploadService,
};
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::upload_session_store::SqlUploadSessionStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn create_upload_session_is_idempotent_for_same_key() {
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

    let store = SqlUploadSessionStore::new(pool);
    let service = DriveUploadService::new(store);

    let first = service
        .create_upload_session(CreateUploadSessionCommand {
            session_id: "upload-session-001".to_string(),
            tenant_id: "tenant-001".to_string(),
            space_id: "space-001".to_string(),
            node_id: "node-001".to_string(),
            bucket: "bucket-001".to_string(),
            object_key: "objects/node-001/v1.bin".to_string(),
            idempotency_key: "idem-abc".to_string(),
            operator_id: "user-001".to_string(),
            expires_at_epoch_ms: 1_800_000_000_000,
        })
        .await
        .expect("first upload session should be created");

    let second = service
        .create_upload_session(CreateUploadSessionCommand {
            session_id: "upload-session-002".to_string(),
            tenant_id: "tenant-001".to_string(),
            space_id: "space-001".to_string(),
            node_id: "node-001".to_string(),
            bucket: "bucket-001".to_string(),
            object_key: "objects/node-001/v1.bin".to_string(),
            idempotency_key: "idem-abc".to_string(),
            operator_id: "user-001".to_string(),
            expires_at_epoch_ms: 1_800_000_000_500,
        })
        .await
        .expect("idempotent call should return existing session");

    assert_eq!(first.id, second.id);
    assert_eq!(first.idempotency_key, second.idempotency_key);
}
