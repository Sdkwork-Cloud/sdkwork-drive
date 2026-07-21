use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_observability::metrics;
use serde_json::Value;
use sqlx::{AnyPool, Row};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};

const MAX_OUTBOX_ATTEMPTS: i32 = 10;
const OUTBOX_BATCH_SIZE: i64 = 100;
const NO_ACTIVE_WATCH_CHANNELS_ERROR: &str = "no_active_watch_channels";
/// Bound webhook fan-out per outbox event to keep dispatch memory O(channels cap).
const MAX_WATCH_CHANNELS_PER_OUTBOX_EVENT: i64 = 200;

static DOMAIN_OUTBOX_DISPATCHER_STARTED: AtomicBool = AtomicBool::new(false);
static IMMEDIATE_OUTBOX_DISPATCH_IN_FLIGHT: AtomicBool = AtomicBool::new(false);

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
    if IMMEDIATE_OUTBOX_DISPATCH_IN_FLIGHT
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tokio::spawn(async move {
        let dispatch_result = dispatch_pending_outbox_events(&pool).await;
        IMMEDIATE_OUTBOX_DISPATCH_IN_FLIGHT.store(false, Ordering::Release);
        if let Err(error) = dispatch_result {
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
    let mut processed_in_batch = HashSet::new();
    for _ in 0..OUTBOX_BATCH_SIZE {
        let Some(claimed) = claim_next_pending_outbox_event(pool, &processed_in_batch).await?
        else {
            break;
        };
        processed_in_batch.insert(claimed.outbox_id.clone());

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
            &claimed.outbox_id,
            &OutboxChangeEvent {
                tenant_id: &claimed.tenant_id,
                space_id: &claimed.space_id,
                payload_json: &claimed.payload_json,
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
    attempt_count: i32,
    payload_json: String,
}

async fn claim_next_pending_outbox_event(
    pool: &AnyPool,
    exclude_ids: &HashSet<String>,
) -> Result<Option<ClaimedOutboxEvent>, String> {
    let engine = resolve_pool_database_engine(pool).await?;
    let exclude_clause = build_outbox_claim_exclude_clause(exclude_ids);
    let row = match engine {
        DatabaseEngine::Postgresql => {
            sqlx::query(&format!(
                "UPDATE dr_drive_domain_outbox
                 SET attempt_count = attempt_count + 1
                 WHERE id = (
                   SELECT id
                   FROM dr_drive_domain_outbox
                   WHERE delivery_status = 'pending' AND attempt_count < $1{exclude_clause}
                   ORDER BY created_at ASC
                   LIMIT 1
                   FOR UPDATE SKIP LOCKED
                 )
                 RETURNING id, tenant_id, space_id, attempt_count, payload_json",
            ))
            .bind(MAX_OUTBOX_ATTEMPTS)
            .fetch_optional(pool)
            .await
        }
        DatabaseEngine::Sqlite => claim_sqlite_outbox_event(pool, &exclude_clause).await,
    }
    .map_err(|error| format!("claim pending domain outbox event failed: {error}"))?;

    let Some(row) = row else {
        return Ok(None);
    };

    Ok(Some(ClaimedOutboxEvent {
        outbox_id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        attempt_count: row.get("attempt_count"),
        payload_json: row.get("payload_json"),
    }))
}

async fn claim_sqlite_outbox_event(
    pool: &AnyPool,
    exclude_clause: &str,
) -> Result<Option<sqlx::any::AnyRow>, sqlx::Error> {
    let mut connection = pool.acquire().await?;
    sqlx::query("BEGIN IMMEDIATE")
        .execute(&mut *connection)
        .await?;
    let claim_result = sqlx::query(&format!(
        "UPDATE dr_drive_domain_outbox
         SET attempt_count = attempt_count + 1
         WHERE id = (
           SELECT id
           FROM dr_drive_domain_outbox
           WHERE delivery_status = 'pending' AND attempt_count < $1{exclude_clause}
           ORDER BY created_at ASC
           LIMIT 1
         )
         RETURNING id, tenant_id, space_id, attempt_count, payload_json",
    ))
    .bind(MAX_OUTBOX_ATTEMPTS)
    .fetch_optional(&mut *connection)
    .await;
    match &claim_result {
        Ok(_) => {
            sqlx::query("COMMIT").execute(&mut *connection).await?;
        }
        Err(_) => {
            let _ = sqlx::query("ROLLBACK").execute(&mut *connection).await;
        }
    }
    claim_result
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
    payload_json: &'a str,
}

async fn dispatch_outbox_event(
    pool: &AnyPool,
    client: &reqwest::Client,
    outbox_id: &str,
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
           AND expiration_epoch_ms > $3
         ORDER BY created_at ASC
         LIMIT $4",
    )
    .bind(event.tenant_id)
    .bind(event.space_id)
    .bind(now_epoch_ms)
    .bind(MAX_WATCH_CHANNELS_PER_OUTBOX_EVENT)
    .fetch_all(pool)
    .await
    .map_err(|error| format!("list watch channels for outbox failed: {error}"))?;

    if rows.is_empty() {
        return Err(NO_ACTIVE_WATCH_CHANNELS_ERROR.to_string());
    }

    let payload: Value = serde_json::from_str(event.payload_json)
        .map_err(|error| format!("domain outbox payload is invalid JSON: {error}"))?;

    for row in rows {
        let channel_id: String = row.get("id");
        let address: String = row.get("address");

        if outbox_channel_already_delivered(pool, outbox_id, &channel_id).await? {
            continue;
        }

        sdkwork_drive_security::validate_webhook_https_url_for_dispatch(&address)
            .await
            .map_err(|detail| {
                format!("outbox webhook channel {channel_id} has invalid address: {detail}")
            })?;
        let idempotency_key = format!("{outbox_id}:{channel_id}");
        let response = client
            .post(&address)
            .json(&payload)
            .header("x-sdkwork-drive-channel-id", &channel_id)
            .header("x-sdkwork-idempotency-key", &idempotency_key)
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

        record_outbox_channel_delivery(pool, outbox_id, &channel_id).await?;
    }

    Ok(())
}

async fn outbox_channel_already_delivered(
    pool: &AnyPool,
    outbox_id: &str,
    channel_id: &str,
) -> Result<bool, String> {
    let exists = sqlx::query_scalar::<_, i32>(
        "SELECT 1
         FROM dr_drive_domain_outbox_channel_delivery
         WHERE outbox_id = $1 AND channel_id = $2
         LIMIT 1",
    )
    .bind(outbox_id)
    .bind(channel_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("probe outbox channel delivery failed: {error}"))?;
    Ok(exists.is_some())
}

async fn record_outbox_channel_delivery(
    pool: &AnyPool,
    outbox_id: &str,
    channel_id: &str,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox_channel_delivery (outbox_id, channel_id, delivered_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (outbox_id, channel_id) DO NOTHING",
    )
    .bind(outbox_id)
    .bind(channel_id)
    .execute(pool)
    .await
    .map_err(|error| format!("record outbox channel delivery failed: {error}"))?;
    Ok(())
}

fn build_outbox_claim_exclude_clause(exclude_ids: &HashSet<String>) -> String {
    if exclude_ids.is_empty() {
        return String::new();
    }
    let quoted = exclude_ids
        .iter()
        .map(|id| format!("'{}'", id.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(", ");
    format!(" AND id NOT IN ({quoted})")
}

async fn resolve_pool_database_engine(pool: &AnyPool) -> Result<DatabaseEngine, String> {
    if let Some(engine) = crate::infrastructure::sql::installed_database_engine() {
        return Ok(engine);
    }

    let sqlite_version = sqlx::query_scalar::<_, String>("SELECT sqlite_version()")
        .fetch_optional(pool)
        .await
        .map_err(|error| format!("probe sqlite_version failed: {error}"))?;
    if sqlite_version.is_some() {
        return Ok(DatabaseEngine::Sqlite);
    }

    Ok(DatabaseEngine::Postgresql)
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

    #[test]
    fn outbox_claim_exclude_clause_escapes_single_quotes() {
        let mut exclude = HashSet::new();
        exclude.insert("outbox-'quoted".to_string());
        assert_eq!(
            build_outbox_claim_exclude_clause(&exclude),
            " AND id NOT IN ('outbox-''quoted')"
        );
    }
}
