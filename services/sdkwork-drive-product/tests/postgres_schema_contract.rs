use sqlx::postgres::PgPoolOptions;

#[tokio::test]
async fn postgres_installer_creates_special_space_profile_tables() {
    let database_url = match std::env::var("SDKWORK_DRIVE_POSTGRES_URL") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!("skip postgres schema contract: SDKWORK_DRIVE_POSTGRES_URL is not set");
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("postgres pool should be created");

    sdkwork_drive_product::infrastructure::sql::install_postgres_schema(&pool)
        .await
        .expect("postgres schema installation should succeed");

    for table_name in [
        "drive_knowledge_space_profile",
        "drive_ai_generation_space_profile",
        "drive_app_upload_space_profile",
        "drive_storage_provider",
        "drive_audit_event",
        "drive_maintenance_job",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name=$1
            )",
        )
        .bind(table_name)
        .fetch_one(&pool)
        .await
        .expect("postgres table lookup should succeed");
        assert!(exists, "expected table exists: {table_name}");
    }

    for index_name in [
        "ix_drive_audit_event_tenant_created",
        "ix_drive_audit_event_resource",
        "ix_drive_audit_event_action_created",
        "ix_drive_audit_event_request_created",
        "ix_drive_audit_event_trace_created",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname='public' AND indexname=$1
            )",
        )
        .bind(index_name)
        .fetch_one(&pool)
        .await
        .expect("postgres index lookup should succeed");
        assert!(exists, "expected index exists: {index_name}");
    }
}
