use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::dispatch_pending_outbox_events;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

async fn sqlite_outbox_pool() -> AnyPool {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite memory pool should connect");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should install");
    pool
}

#[tokio::test]
async fn sqlite_claims_pending_outbox_event_without_skip_locked() {
    let pool = sqlite_outbox_pool().await;
    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox (
            id, tenant_id, space_id, node_id, event_type, actor_id, sequence_no, payload_json
        ) VALUES (
            'outbox-1', '100001', 'space-1', NULL, 'node.updated', 'user-1', 1, '{}'
        )",
    )
    .execute(&pool)
    .await
    .expect("seed outbox row");

    let result = dispatch_pending_outbox_events(&pool)
        .await
        .expect("sqlite outbox dispatch should run");
    assert_eq!(1, result.processed);
    assert_eq!(0, result.delivered);
    assert_eq!(0, result.failed);

    let attempt_count: i32 = sqlx::query_scalar(
        "SELECT attempt_count FROM dr_drive_domain_outbox WHERE id = 'outbox-1'",
    )
    .fetch_one(&pool)
    .await
    .expect("outbox row should remain");
    assert_eq!(1, attempt_count);
}
