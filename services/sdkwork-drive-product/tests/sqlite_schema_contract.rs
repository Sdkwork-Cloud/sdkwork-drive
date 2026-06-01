use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_installer_creates_special_space_profile_tables() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");

    sdkwork_drive_product::infrastructure::sql::install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema installation should succeed");

    for table_name in [
        "drive_knowledge_space_profile",
        "drive_ai_generation_space_profile",
        "drive_app_upload_space_profile",
        "drive_storage_provider",
        "drive_audit_event",
        "drive_maintenance_job",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(table_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite table lookup should succeed");
        assert_eq!(count, 1, "expected table exists: {table_name}");
    }

    for index_name in [
        "ix_drive_audit_event_tenant_created",
        "ix_drive_audit_event_resource",
        "ix_drive_audit_event_action_created",
        "ix_drive_audit_event_request_created",
        "ix_drive_audit_event_trace_created",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='index' AND name=?1")
                .bind(index_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite index lookup should succeed");
        assert_eq!(count, 1, "expected index exists: {index_name}");
    }
}
