use async_trait::async_trait;
use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::{
    dispatch_pending_outbox_events, dispatch_pending_outbox_events_with_relay,
};
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sdkwork_drive_workspace_service::ports::domain_outbox_embedded_relay::{
    DeliverDriveDomainOutboxEmbeddedEventRequest, DriveDomainOutboxEmbeddedRelay,
    DriveDomainOutboxEmbeddedRelayError, DriveDomainOutboxEmbeddedTarget,
    ResolveDriveDomainOutboxEmbeddedTargetsRequest,
};
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use std::sync::atomic::{AtomicUsize, Ordering};

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
async fn sqlite_claims_pending_outbox_event_with_begin_immediate() {
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

#[tokio::test]
async fn sqlite_embedded_relay_reuses_outbox_retry_and_channel_idempotency() {
    let pool = sqlite_outbox_pool().await;
    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox (
            id, tenant_id, space_id, node_id, event_type, actor_id, sequence_no, payload_json
        ) VALUES (
            'outbox-embedded-1', '100001', 'space-1', 'node-1',
            'drive.node.deleted.v1', 'user-1', 1, '{\"id\":\"event-embedded-1\"}'
        )",
    )
    .execute(&pool)
    .await
    .expect("seed embedded outbox row");
    let relay = RecordingRelay::default();

    let first = dispatch_pending_outbox_events_with_relay(&pool, &relay)
        .await
        .expect("embedded outbox dispatch should run");
    assert_eq!(first.processed, 1);
    assert_eq!(first.delivered, 1);
    assert_eq!(relay.deliveries.load(Ordering::Relaxed), 1);

    let status: String = sqlx::query_scalar(
        "SELECT delivery_status FROM dr_drive_domain_outbox WHERE id = 'outbox-embedded-1'",
    )
    .fetch_one(&pool)
    .await
    .expect("read delivered outbox status");
    assert_eq!(status, "delivered");
    let channel_deliveries: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM dr_drive_domain_outbox_channel_delivery
         WHERE outbox_id = 'outbox-embedded-1' AND channel_id = 'embedded:kbraw:scope-1'",
    )
    .fetch_one(&pool)
    .await
    .expect("read embedded channel delivery");
    assert_eq!(channel_deliveries, 1);

    let replay = dispatch_pending_outbox_events_with_relay(&pool, &relay)
        .await
        .expect("delivered outbox replay should be idle");
    assert_eq!(replay.processed, 0);
    assert_eq!(relay.deliveries.load(Ordering::Relaxed), 1);
}

#[tokio::test]
async fn postgres_claims_pending_outbox_event_with_skip_locked() {
    let database_url = match std::env::var("SDKWORK_DRIVE_POSTGRES_URL") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!("skip postgres outbox dispatch: SDKWORK_DRIVE_POSTGRES_URL is not set");
            return;
        }
    };

    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("postgres pool should connect");
    install_any_schema(&pool, DatabaseEngine::Postgresql)
        .await
        .expect("postgres schema should install");

    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox (
            id, tenant_id, space_id, node_id, event_type, actor_id, sequence_no, payload_json
        ) VALUES (
            'outbox-pg-1', '100001', 'space-1', NULL, 'node.updated', 'user-1', 1, '{}'
        )",
    )
    .execute(&pool)
    .await
    .expect("seed postgres outbox row");

    let result = dispatch_pending_outbox_events(&pool)
        .await
        .expect("postgres outbox dispatch should run");
    assert_eq!(1, result.processed);
    assert_eq!(0, result.delivered);
    assert_eq!(0, result.failed);

    let attempt_count: i32 = sqlx::query_scalar(
        "SELECT attempt_count FROM dr_drive_domain_outbox WHERE id = 'outbox-pg-1'",
    )
    .fetch_one(&pool)
    .await
    .expect("postgres outbox row should remain");
    assert_eq!(1, attempt_count);
}

#[derive(Default)]
struct RecordingRelay {
    deliveries: AtomicUsize,
}

#[async_trait]
impl DriveDomainOutboxEmbeddedRelay for RecordingRelay {
    async fn resolve_targets(
        &self,
        request: ResolveDriveDomainOutboxEmbeddedTargetsRequest<'_>,
    ) -> Result<Vec<DriveDomainOutboxEmbeddedTarget>, DriveDomainOutboxEmbeddedRelayError> {
        assert_eq!(request.tenant_id, "100001");
        assert_eq!(request.space_id, "space-1");
        Ok(vec![DriveDomainOutboxEmbeddedTarget {
            channel_id: "embedded:kbraw:scope-1".to_string(),
            source_scope_uuid: "scope-1".to_string(),
        }])
    }

    async fn deliver(
        &self,
        request: DeliverDriveDomainOutboxEmbeddedEventRequest<'_>,
    ) -> Result<(), DriveDomainOutboxEmbeddedRelayError> {
        assert_eq!(request.outbox_id, "outbox-embedded-1");
        assert_eq!(request.channel_id, "embedded:kbraw:scope-1");
        assert_eq!(request.source_scope_uuid, "scope-1");
        self.deliveries.fetch_add(1, Ordering::Relaxed);
        Ok(())
    }
}
