use sdkwork_drive_observability::metrics;
use serde_json::json;
use sqlx::{AnyPool, Row};

const MAX_OUTBOX_ATTEMPTS: i32 = 10;
const OUTBOX_BATCH_SIZE: i64 = 100;

#[derive(Debug, Clone, Default)]
pub struct DomainOutboxDispatchResult {
    pub processed: usize,
    pub delivered: usize,
    pub failed: usize,
}

pub fn spawn_pending_outbox_dispatch(pool: AnyPool) {
    tokio::spawn(async move {
        let interval_secs = std::env::var("SDKWORK_DRIVE_DOMAIN_OUTBOX_DISPATCH_INTERVAL_SECONDS")
            .ok()
            .and_then(|value| value.trim().parse::<u64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(15);
        let mut interval =
            tokio::time::interval(std::time::Duration::from_secs(interval_secs));
        interval.tick().await;
        loop {
            interval.tick().await;
            if let Err(error) = dispatch_pending_outbox_events(&pool).await {
                tracing::warn!(
                    target: "sdkwork.drive",
                    event = "drive.domain_outbox.dispatch_failed",
                    error = %error,
                    "domain outbox dispatch failed"
                );
            }
        }
    });
}

pub async fn dispatch_pending_outbox_events(
    pool: &AnyPool,
) -> Result<DomainOutboxDispatchResult, String> {
    let rows = sqlx::query(
        "SELECT id, tenant_id, space_id, node_id, event_type, actor_id, sequence_no, attempt_count
         FROM dr_drive_domain_outbox
         WHERE delivery_status = 'pending' AND attempt_count < $1
         ORDER BY created_at ASC
         LIMIT $2",
    )
    .bind(MAX_OUTBOX_ATTEMPTS)
    .bind(OUTBOX_BATCH_SIZE)
    .fetch_all(pool)
    .await
    .map_err(|error| format!("list pending domain outbox events failed: {error}"))?;

    let mut result = DomainOutboxDispatchResult::default();
    if rows.is_empty() {
        return Ok(result);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|error| format!("build outbox webhook client failed: {error}"))?;

    for row in rows {
        result.processed += 1;
        let outbox_id: String = row.get("id");
        let tenant_id: String = row.get("tenant_id");
        let space_id: String = row.get("space_id");
        let node_id: Option<String> = row.get("node_id");
        let event_type: String = row.get("event_type");
        let actor_id: String = row.get("actor_id");
        let sequence_no: i64 = row.get("sequence_no");
        let attempt_count: i32 = row.get("attempt_count");

        match dispatch_outbox_event(
            pool,
            &client,
            &OutboxChangeEvent {
                tenant_id: &tenant_id,
                space_id: &space_id,
                node_id: node_id.as_deref(),
                event_type: &event_type,
                sequence_no,
                actor_id: &actor_id,
            },
        )
        .await
        {
            Ok(()) => {
                sqlx::query(
                    "UPDATE dr_drive_domain_outbox
                     SET delivery_status = 'delivered',
                         delivered_at = CURRENT_TIMESTAMP,
                         last_error = NULL
                     WHERE id = $1",
                )
                .bind(&outbox_id)
                .execute(pool)
                .await
                .map_err(|error| format!("mark domain outbox event delivered failed: {error}"))?;
                metrics::record_outbox_delivered();
                result.delivered += 1;
            }
            Err(error) => {
                let next_attempt_count = attempt_count + 1;
                let delivery_status = if next_attempt_count >= MAX_OUTBOX_ATTEMPTS {
                    "failed"
                } else {
                    "pending"
                };
                sqlx::query(
                    "UPDATE dr_drive_domain_outbox
                     SET attempt_count = $1,
                         delivery_status = $2,
                         last_error = $3
                     WHERE id = $4",
                )
                .bind(next_attempt_count)
                .bind(delivery_status)
                .bind(error.clone())
                .bind(&outbox_id)
                .execute(pool)
                .await
                .map_err(|update_error| {
                    format!("update failed domain outbox event failed: {update_error}")
                })?;
                if delivery_status == "failed" {
                    result.failed += 1;
                }
            }
        }
    }

    Ok(result)
}

struct OutboxChangeEvent<'a> {
    tenant_id: &'a str,
    space_id: &'a str,
    node_id: Option<&'a str>,
    event_type: &'a str,
    sequence_no: i64,
    actor_id: &'a str,
}

async fn dispatch_outbox_event(
    pool: &AnyPool,
    client: &reqwest::Client,
    event: &OutboxChangeEvent<'_>,
) -> Result<(), String> {
    let now_epoch_ms = chrono::Utc::now().timestamp_millis();
    let rows = sqlx::query(
        "SELECT id, address
         FROM dr_drive_watch_channel
         WHERE tenant_id=$1
           AND lifecycle_status='active'
           AND resource_type='changes'
           AND (space_id IS NULL OR space_id=$2)
           AND expiration_epoch_ms > $3",
    )
    .bind(event.tenant_id)
    .bind(event.space_id)
    .bind(now_epoch_ms)
    .fetch_all(pool)
    .await
    .map_err(|error| format!("list watch channels for outbox failed: {error}"))?;

    if rows.is_empty() {
        return Ok(());
    }

    let payload = json!({
        "tenantId": event.tenant_id,
        "spaceId": event.space_id,
        "nodeId": event.node_id,
        "eventType": event.event_type,
        "sequenceNo": event.sequence_no,
        "actorId": event.actor_id,
        "resourceType": "changes",
        "deliverySource": "domain_outbox",
    });

    for row in rows {
        let channel_id: String = row.get("id");
        let address: String = row.get("address");
        sdkwork_drive_security::validate_webhook_https_url(&address).map_err(|detail| {
            format!("outbox webhook channel {channel_id} has invalid address: {detail}")
        })?;
        let response = client
            .post(&address)
            .json(&payload)
            .header("x-sdkwork-drive-channel-id", &channel_id)
            .send()
            .await
            .map_err(|error| {
                format!("dispatch outbox event to channel {channel_id} failed: {error}")
            })?;
        if !response.status().is_success() {
            return Err(format!(
                "outbox webhook channel {channel_id} returned status {}",
                response.status()
            ));
        }
    }

    Ok(())
}
