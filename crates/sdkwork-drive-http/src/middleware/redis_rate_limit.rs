//! Redis-backed rate-limit backend for multi-instance deployments.
//!
//! Uses a sliding-window counter stored as a Redis sorted set, which allows
//! atomic window pruning and counting across all gateway instances.
//!
//! This module is gated behind the `redis-rate-limit` feature flag.
//! Build with: `cargo build --features redis-rate-limit`

#![cfg(feature = "redis-rate-limit")]

use std::sync::OnceLock;

use redis::aio::ConnectionManager;
use redis::AsyncCommands;

use super::RateLimitConfig;

/// Shared Redis connection manager (singleton per process).
fn redis_manager() -> Option<&'static ConnectionManager> {
    static MANAGER: OnceLock<Option<ConnectionManager>> = OnceLock::new();
    MANAGER.get_or_init(|| {
        let url = std::env::var("SDKWORK_DRIVE_RATE_LIMIT_REDIS_URL")
            .or_else(|_| std::env::var("REDIS_URL"))
            .ok()?;
        let client = redis::Client::open(url.as_str()).ok()?;
        // Use current runtime if available, otherwise create one.
        let manager = tokio::runtime::Handle::try_current()
            .ok()
            .and_then(|handle| {
                tokio::task::block_in_place(|| {
                    handle.block_on(async {
                        ConnectionManager::new(client.clone()).await.ok()
                    })
                })
            })
            .or_else(|| {
                tokio::runtime::Runtime::new()
                    .ok()
                    .and_then(|rt| {
                        rt.block_on(async {
                            ConnectionManager::new(client.clone()).await.ok()
                        })
                    })
            });
        manager
    })
    .as_ref()
}

/// Allow check using Redis sorted set sliding window.
///
/// Returns `true` if the key is within its rate limit, `false` otherwise.
pub async fn redis_allow(key: &str, config: &RateLimitConfig) -> bool {
    if !config.enabled {
        return true;
    }

    let manager = match redis_manager() {
        Some(m) => m.clone(),
        None => return true, // Redis unavailable — fall open (safer than deny-all).
    };

    let window_ms = config.window.as_millis() as i64;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let cutoff = now_ms - window_ms;

    let mut conn = manager.clone();

    let result: Result<Option<i64>, _> = redis::pipe()
        .cmd("ZREMRANGEBYSCORE")
        .arg(key)
        .arg(0)
        .arg(cutoff)
        .ignore()
        .cmd("ZADD")
        .arg(key)
        .arg(now_ms)
        .arg(now_ms)
        .ignore()
        .cmd("ZCOUNT")
        .arg(key)
        .arg(cutoff)
        .arg(now_ms)
        .query_async(&mut conn)
        .await;

    match result {
        Ok(Some(count)) => (count as u32) <= config.max_requests,
        Ok(None) => true,
        Err(_) => true, // Redis error — fall open.
    }
}
