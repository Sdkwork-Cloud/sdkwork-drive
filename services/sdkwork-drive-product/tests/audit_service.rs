use sdkwork_drive_product::application::audit_service::{
    DriveAuditService, ListAuditEventsCommand, RecordAuditEventCommand,
};
use sdkwork_drive_product::infrastructure::sql::audit_store::SqlAuditStore;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn record_audit_event_persists_append_only_row() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveAuditService::new(SqlAuditStore::new(pool.clone()));
    service
        .record_event(RecordAuditEventCommand {
            tenant_id: "tenant-001".to_string(),
            action: "storage_provider.created".to_string(),
            resource_type: "storage_provider".to_string(),
            resource_id: "provider-001".to_string(),
            operator_id: "admin-001".to_string(),
            request_id: Some("request-001".to_string()),
            trace_id: Some("trace-001".to_string()),
        })
        .await
        .expect("audit event should be recorded");

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM drive_audit_event
         WHERE tenant_id=?1
           AND action=?2
           AND resource_type=?3
           AND resource_id=?4
           AND operator_id=?5",
    )
    .bind("tenant-001")
    .bind("storage_provider.created")
    .bind("storage_provider")
    .bind("provider-001")
    .bind("admin-001")
    .fetch_one(&pool)
    .await
    .expect("audit table should be queryable");
    assert_eq!(count, 1);
}

#[tokio::test]
async fn list_audit_events_supports_filter_and_pagination() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    for (tenant_id, action, resource_id, request_id, trace_id) in [
        (
            "tenant-001",
            "storage_provider.created",
            "provider-001",
            "request-001",
            "trace-001",
        ),
        (
            "tenant-001",
            "storage_provider.tested",
            "provider-001",
            "request-002",
            "trace-002",
        ),
        (
            "tenant-002",
            "storage_provider.created",
            "provider-002",
            "request-003",
            "trace-003",
        ),
    ] {
        sqlx::query(
            "INSERT INTO drive_audit_event (
                tenant_id, action, resource_type, resource_id,
                operator_id, request_id, trace_id
            ) VALUES (?1, ?2, 'storage_provider', ?3, 'admin-001', ?4, ?5)",
        )
        .bind(tenant_id)
        .bind(action)
        .bind(resource_id)
        .bind(request_id)
        .bind(trace_id)
        .execute(&pool)
        .await
        .expect("seed audit event should succeed");
    }

    let service = DriveAuditService::new(SqlAuditStore::new(pool));
    let page = service
        .list_events(ListAuditEventsCommand {
            tenant_id: Some("tenant-001".to_string()),
            action: Some("storage_provider.created".to_string()),
            resource_type: Some("storage_provider".to_string()),
            resource_id: None,
            request_id: None,
            trace_id: None,
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect("audit event list should succeed");
    assert_eq!(page.total, 1);
    assert_eq!(page.items.len(), 1);
    assert_eq!(page.items[0].action, "storage_provider.created");

    let paged = service
        .list_events(ListAuditEventsCommand {
            tenant_id: Some("tenant-001".to_string()),
            action: None,
            resource_type: Some("storage_provider".to_string()),
            resource_id: None,
            request_id: None,
            trace_id: None,
            page: Some(1),
            page_size: Some(1),
        })
        .await
        .expect("paged list should succeed");
    assert_eq!(paged.total, 2);
    assert_eq!(paged.items.len(), 1);

    let request_trace_filtered = service
        .list_events(ListAuditEventsCommand {
            tenant_id: Some("tenant-001".to_string()),
            action: None,
            resource_type: Some("storage_provider".to_string()),
            resource_id: None,
            request_id: Some("request-002".to_string()),
            trace_id: Some("trace-002".to_string()),
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect("request_id and trace_id filtered list should succeed");
    assert_eq!(request_trace_filtered.total, 1);
    assert_eq!(request_trace_filtered.items.len(), 1);
    assert_eq!(
        request_trace_filtered.items[0].action,
        "storage_provider.tested"
    );
}

#[tokio::test]
async fn list_audit_events_rejects_invalid_identifier_filters() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveAuditService::new(SqlAuditStore::new(pool));

    let action_error = service
        .list_events(ListAuditEventsCommand {
            tenant_id: None,
            action: Some("storage provider.created".to_string()),
            resource_type: None,
            resource_id: None,
            request_id: None,
            trace_id: None,
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect_err("invalid action filter should be rejected");
    assert!(
        format!("{action_error:?}").contains("action contains invalid characters"),
        "unexpected action validation error: {action_error:?}"
    );

    let resource_id_error = service
        .list_events(ListAuditEventsCommand {
            tenant_id: None,
            action: None,
            resource_type: None,
            resource_id: Some("provider/001".to_string()),
            request_id: None,
            trace_id: None,
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect_err("invalid resource_id filter should be rejected");
    assert!(
        format!("{resource_id_error:?}").contains("resource_id contains invalid characters"),
        "unexpected resource_id validation error: {resource_id_error:?}"
    );

    let request_id_error = service
        .list_events(ListAuditEventsCommand {
            tenant_id: None,
            action: None,
            resource_type: None,
            resource_id: None,
            request_id: Some("request id".to_string()),
            trace_id: None,
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect_err("invalid request_id filter should be rejected");
    assert!(
        format!("{request_id_error:?}").contains("request_id contains invalid characters"),
        "unexpected request_id validation error: {request_id_error:?}"
    );

    let trace_id_error = service
        .list_events(ListAuditEventsCommand {
            tenant_id: None,
            action: None,
            resource_type: None,
            resource_id: None,
            request_id: None,
            trace_id: Some("x".repeat(129)),
            page: Some(1),
            page_size: Some(10),
        })
        .await
        .expect_err("too long trace_id filter should be rejected");
    assert!(
        format!("{trace_id_error:?}").contains("trace_id length must be <= 128"),
        "unexpected trace_id validation error: {trace_id_error:?}"
    );
}
