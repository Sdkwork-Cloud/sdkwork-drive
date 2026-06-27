use sdkwork_drive_observability::metrics;
use serde_json::json;
use sqlx::{AnyPool, Row};
use std::sync::atomic::{AtomicBool, Ordering};

const MAX_OUTBOX_ATTEMPTS: i32 = 10;
const OUTBOX_BATCH_SIZE: i64 = 100;
const NO_ACTIVE_WATCH_CHANNELS_ERROR: &str = "no_active_watch_channels";

static DOMAIN_OUTBOX_DISPATCHER_STARTED: AtomicBool = AtomicBool::new(false);

fn embedded_outbox_dispatch_disabled() -> bool {
    std::env::var("SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH")
        .ok()
        .map(|value| {
            let value = value.trim().to_ascii_lowercase();
            value == "0" || value == "false" || value == "off" || value == "disabled"
        })
        .unwrap_or(false)
}

#[derive(Debug, Clone, Default)]
pub struct DomainOutboxDispatchResult {
    pub processed: usize,
    pub delivered: usize,
    pub failed: usize,
}

/// Starts at most one embedded periodic outbox dispatcher per process.
///
/// Cloud deployments that run `sdkwork-drive-install-worker` should set
/// `SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH=false` on API pods.
pub fn ensure_domain_outbox_dispatcher(pool: AnyPool) {
    if embedded_outbox_dispatch_disabled() {
        return;
    }
    if DOMAIN_OUTBOX_DISPATCHER_STARTED
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tokio::spawn(async move {
        let interval_secs = std::env::var("SDKWORK_DRIVE_DOMAIN_OUTBOX_DISPATCH_INTERVAL_SECONDS")
            .ok()
            .and_then(|value| value.trim().parse::<u64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(15);
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_secs));
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

/// Backward-compatible alias for callers that previously spawned duplicate loops.
pub fn spawn_pending_outbox_dispatch(pool: AnyPool) {
    ensure_domain_outbox_dispatcher(pool);
}

/// Attempt one immediate outbox delivery pass without starting another periodic loop.
pub fn trigger_immediate_outbox_dispatch(pool: AnyPool) {
    tokio::spawn(async move {
        if let Err(error) = dispatch_pending_outbox_events(&pool).await {
            tracing::warn!(
                target: "sdkwork.drive",
                event = "drive.domain_outbox.immediate_dispatch_failed",
                error = %error,
                "immediate domain outbox dispatch failed"
            );
        }
    });
}

pub async fn dispatch_pending_outbox_events(
    pool: &AnyPool,
) -> Result<DomainOutboxDispatchResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|error| format!("build outbox webhook client failed: {error}"))?;

    let mut result = DomainOutboxDispatchResult::default();
    for _ in 0..OUTBOX_BATCH_SIZE {
        let Some(claimed) = claim_next_pending_outbox_event(pool).await? else {
            break;
        };

        result.processed += 1;
        if claimed.attempt_count > MAX_OUTBOX_ATTEMPTS {
            mark_outbox_event_failed(
                pool,
                &claimed.outbox_id,
                claimed.attempt_count,
                "outbox delivery attempts exhausted during claim",
            )
            .await?;
            result.failed += 1;
            continue;
        }

        match dispatch_outbox_event(
            pool,
            &client,
            &OutboxChangeEvent {
                tenant_id: &claimed.tenant_id,
                space_id: &claimed.space_id,
                node_id: claimed.node_id.as_deref(),
                event_type: &claimed.event_type,
                sequence_no: claimed.sequence_no,
                actor_id: &claimed.actor_id,
            },
        )
        .await
        {
            Ok(()) => {
                mark_outbox_event_delivered(pool, &claimed.outbox_id).await?;
                metrics::record_outbox_delivered();
                result.delivered += 1;
            }
            Err(error) => {
                let delivery_status = if claimed.attempt_count >= MAX_OUTBOX_ATTEMPTS {
                    "failed"
                } else {
                    "pending"
                };
                mark_outbox_event_attempt_failed(
                    pool,
                    &claimed.outbox_id,
                    claimed.attempt_count,
                    delivery_status,
                    &error,
                )
                .await?;
                if delivery_status == "failed" {
                    result.failed += 1;
                }
            }
        }
    }

    Ok(result)
}

struct ClaimedOutboxEvent {
    outbox_id: String,
    tenant_id: String,
    space_id: String,
    node_id: Option<String>,
    event_type: String,
    actor_id: String,
    sequence_no: i64,
    attempt_count: i32,
}

async fn claim_next_pending_outbox_event(
    pool: &AnyPool,
) -> Result<Option<ClaimedOutboxEvent>, String> {
    let row = sqlx::query(
        "UPDATE dr_drive_domain_outbox
         SET attempt_count = attempt_count + 1
         WHERE id = (
           SELECT id
           FROM dr_drive_domain_outbox
           WHERE delivery_status = 'pending' AND attempt_count < $1
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, tenant_id, space_id, node_id, event_type, actor_id, sequence_no, attempt_count",
    )
    .bind(MAX_OUTBOX_ATTEMPTS)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("claim pending domain outbox event failed: {error}"))?;

    let Some(row) = row else {
        return Ok(None);
    };

    Ok(Some(ClaimedOutboxEvent {
        outbox_id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        node_id: row.get("node_id"),
        event_type: row.get("event_type"),
        actor_id: row.get("actor_id"),
        sequence_no: row.get("sequence_no"),
        attempt_count: row.get("attempt_count"),
    }))
}

async fn mark_outbox_event_delivered(pool: &AnyPool, outbox_id: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE dr_drive_domain_outbox
         SET delivery_status = 'delivered',
             delivered_at = CURRENT_TIMESTAMP,
             last_error = NULL
         WHERE id = $1",
    )
    .bind(outbox_id)
    .execute(pool)
    .await
    .map_err(|error| format!("mark domain outbox event delivered failed: {error}"))?;
    Ok(())
}

async fn mark_outbox_event_attempt_failed(
    pool: &AnyPool,
    outbox_id: &str,
    attempt_count: i32,
    delivery_status: &str,
    error: &str,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE dr_drive_domain_outbox
         SET delivery_status = $1,
             last_error = $2
         WHERE id = $3 AND attempt_count = $4",
    )
    .bind(delivery_status)
    .bind(error)
    .bind(outbox_id)
    .bind(attempt_count)
    .execute(pool)
    .await
    .map_err(|update_error| format!("update failed domain outbox event failed: {update_error}"))?;
    Ok(())
}

async fn mark_outbox_event_failed(
    pool: &AnyPool,
    outbox_id: &str,
    attempt_count: i32,
    error: &str,
) -> Result<(), String> {
    mark_outbox_event_attempt_failed(pool, outbox_id, attempt_count, "failed", error).await
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
        return Err(NO_ACTIVE_WATCH_CHANNELS_ERROR.to_string());
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
        sdkwork_drive_security::validate_webhook_https_url_for_dispatch(&address)
            .await
            .map_err(|detail| {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_outbox_dispatch_disabled_parses_false_values() {
        std::env::set_var("SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH", "false");
        assert!(embedded_outbox_dispatch_disabled());
        std::env::remove_var("SDKWORK_DRIVE_DOMAIN_OUTBOX_EMBEDDED_DISPATCH");
    }

    #[test]
    fn no_active_watch_channels_error_is_stable() {
        assert_eq!(NO_ACTIVE_WATCH_CHANNELS_ERROR, "no_active_watch_channels");
    }
}
