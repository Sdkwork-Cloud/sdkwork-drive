use sdkwork_drive_product::application::quota_service::{
    DriveQuotaService, GetTenantQuotaSummaryCommand,
};
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::quota_store::SqlQuotaStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn tenant_quota_summary_only_counts_active_storage_objects() {
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
        .expect("node should be inserted");
    }

    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
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
    .bind("active")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("active object should be inserted");

    sqlx::query(
        "INSERT INTO drive_storage_object (
            id, tenant_id, node_id, version_no, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    )
    .bind("obj-002")
    .bind("tenant-001")
    .bind("node-002")
    .bind(1_i64)
    .bind("bucket-001")
    .bind("objects/node-002/b.bin")
    .bind("application/octet-stream")
    .bind(64_i64)
    .bind("sha256:2")
    .bind("deleted")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("deleted object should be inserted");

    let service = DriveQuotaService::new(SqlQuotaStore::new(pool));
    let summary = service
        .get_tenant_quota_summary(GetTenantQuotaSummaryCommand {
            tenant_id: "tenant-001".to_string(),
        })
        .await
        .expect("quota summary should succeed");

    assert_eq!(summary.total_bytes, 128);
    assert_eq!(summary.object_count, 1);
}
