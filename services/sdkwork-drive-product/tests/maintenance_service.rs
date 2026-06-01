use sdkwork_drive_product::application::maintenance_service::{
    DriveMaintenanceService, ListMaintenanceJobsCommand, SweepObjectStoreCommand,
    SweepUploadSessionsCommand,
};
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::maintenance_store::SqlMaintenanceStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn upload_session_sweep_marks_expired_sessions() {
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

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool.clone()));
    let result = service
        .sweep_upload_sessions(SweepUploadSessionsCommand {
            now_epoch_ms: 1_800_000_000_000_i64,
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-ops".to_string(),
            request_id: None,
            trace_id: None,
        })
        .await
        .expect("upload session sweep should succeed");
    assert_eq!(result.scanned_count, 1);
    assert_eq!(result.affected_count, 1);

    let state: String =
        sqlx::query_scalar("SELECT state FROM drive_upload_session WHERE id='session-001'")
            .fetch_one(&pool)
            .await
            .expect("session state should be queryable");
    assert_eq!(state, "expired");
}

#[tokio::test]
async fn object_sweep_deletes_deleted_storage_objects() {
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
        ) VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, 'deleted', ?9, ?10),
            (?11, ?12, ?13, 2, ?14, ?15, ?16, ?17, ?18, 'active', ?19, ?20)",
    )
    .bind("obj-001")
    .bind("tenant-001")
    .bind("node-001")
    .bind("bucket-001")
    .bind("objects/node-001/a.bin")
    .bind("application/octet-stream")
    .bind(128_i64)
    .bind("sha256:1")
    .bind("admin-001")
    .bind("admin-001")
    .bind("obj-002")
    .bind("tenant-001")
    .bind("node-001")
    .bind("bucket-001")
    .bind("objects/node-001/b.bin")
    .bind("application/octet-stream")
    .bind(256_i64)
    .bind("sha256:2")
    .bind("admin-001")
    .bind("admin-001")
    .execute(&pool)
    .await
    .expect("storage objects should be inserted");

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool.clone()));
    let result = service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-ops".to_string(),
            request_id: None,
            trace_id: None,
        })
        .await
        .expect("object sweep should succeed");
    assert_eq!(result.scanned_count, 1);
    assert_eq!(result.affected_count, 1);

    let count: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM drive_storage_object")
        .fetch_one(&pool)
        .await
        .expect("object count should be queryable");
    assert_eq!(count, 1);
}

#[tokio::test]
async fn maintenance_service_records_jobs_and_lists_with_filters() {
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
        ) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, 'deleted', ?9, ?10)",
    )
    .bind("obj-001")
    .bind("tenant-001")
    .bind("node-001")
    .bind("bucket-001")
    .bind("objects/node-001/a.bin")
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

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool.clone()));
    service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-ops".to_string(),
            request_id: Some("request-001".to_string()),
            trace_id: Some("trace-001".to_string()),
        })
        .await
        .expect("object sweep should succeed");
    service
        .sweep_upload_sessions(SweepUploadSessionsCommand {
            now_epoch_ms: 1_800_000_000_000_i64,
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-ops".to_string(),
            request_id: Some("request-001".to_string()),
            trace_id: Some("trace-001".to_string()),
        })
        .await
        .expect("upload session sweep should succeed");

    let page = service
        .list_maintenance_jobs(ListMaintenanceJobsCommand {
            job_type: None,
            status: None,
            operator_id: Some("admin-ops".to_string()),
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect("maintenance jobs list should succeed");
    assert_eq!(page.total, 2);
    assert_eq!(page.items.len(), 2);
    assert_eq!(page.items[0].job_type, "upload_session_sweep");
    assert_eq!(page.items[1].job_type, "object_sweep");
    assert_eq!(page.items[0].status, "completed");
    assert_eq!(page.items[0].request_id.as_deref(), Some("request-001"));
    assert_eq!(page.items[0].trace_id.as_deref(), Some("trace-001"));
    for item in page.items {
        assert!(
            item.started_at.contains('T') && item.started_at.ends_with('Z'),
            "started_at should be RFC3339 UTC: {}",
            item.started_at
        );
        assert!(
            item.finished_at.contains('T') && item.finished_at.ends_with('Z'),
            "finished_at should be RFC3339 UTC: {}",
            item.finished_at
        );
        assert!(
            item.created_at.contains('T') && item.created_at.ends_with('Z'),
            "created_at should be RFC3339 UTC: {}",
            item.created_at
        );
    }
}

#[tokio::test]
async fn maintenance_service_records_failed_job_when_sweep_errors() {
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

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool.clone()));
    let error = service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-ops".to_string(),
            request_id: Some("request-failed-001".to_string()),
            trace_id: Some("trace-failed-001".to_string()),
        })
        .await
        .expect_err("object sweep should fail when table missing");
    let error_message = format!("{error:?}");
    assert!(
        error_message.contains("count deleted drive_storage_object failed"),
        "unexpected error: {error_message}"
    );

    let failed_jobs: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_maintenance_job
         WHERE job_type='object_sweep'
           AND status='failed'
           AND operator_id='admin-ops'
           AND request_id='request-failed-001'
           AND trace_id='trace-failed-001'
           AND error_message IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("failed maintenance jobs should be queryable");
    assert_eq!(failed_jobs, 1);
}

#[tokio::test]
async fn maintenance_service_records_failed_upload_sweep_job_when_table_missing() {
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

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool.clone()));
    let error = service
        .sweep_upload_sessions(SweepUploadSessionsCommand {
            now_epoch_ms: 1_800_000_000_000_i64,
            dry_run: false,
            limit: Some(100),
            operator_id: "admin-upload-failed".to_string(),
            request_id: Some("request-upload-failed-001".to_string()),
            trace_id: Some("trace-upload-failed-001".to_string()),
        })
        .await
        .expect_err("upload sweep should fail when table missing");
    let error_message = format!("{error:?}");
    assert!(
        error_message.contains("count expired drive_upload_session failed"),
        "unexpected error: {error_message}"
    );

    let failed_jobs: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_maintenance_job
         WHERE job_type='upload_session_sweep'
           AND status='failed'
           AND operator_id='admin-upload-failed'
           AND request_id='request-upload-failed-001'
           AND trace_id='trace-upload-failed-001'
           AND error_message IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("failed upload maintenance jobs should be queryable");
    assert_eq!(failed_jobs, 1);
}

#[tokio::test]
async fn maintenance_service_rejects_invalid_identifier_inputs() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(pool));
    let invalid_operator_error = service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: true,
            limit: Some(1),
            operator_id: "admin ops".to_string(),
            request_id: None,
            trace_id: None,
        })
        .await
        .expect_err("operator_id with spaces should be rejected");
    let invalid_operator_message = format!("{invalid_operator_error:?}");
    assert!(
        invalid_operator_message.contains("operator_id contains invalid characters"),
        "unexpected error: {invalid_operator_message}"
    );

    let too_long_request_id = "a".repeat(65);
    let invalid_request_error = service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: true,
            limit: Some(1),
            operator_id: "admin-ops".to_string(),
            request_id: Some(too_long_request_id),
            trace_id: None,
        })
        .await
        .expect_err("request_id longer than 64 should be rejected");
    let invalid_request_message = format!("{invalid_request_error:?}");
    assert!(
        invalid_request_message.contains("request_id length must be <= 64"),
        "unexpected error: {invalid_request_message}"
    );
}
