use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const MAX_RATE_LIMIT_BUCKETS: usize = 10_000;

#[derive(Debug, Clone, Copy)]
pub struct RateLimitConfig {
    pub window: Duration,
    pub max_requests: u32,
}

struct RateLimitState {
    config: RateLimitConfig,
    buckets: Mutex<HashMap<String, Vec<Instant>>>,
}

pub struct SharedRateLimitState(RateLimitState);

impl RateLimitState {
    fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            buckets: Mutex::new(HashMap::new()),
        }
    }

    fn allow(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut buckets = match self.buckets.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if buckets.len() >= MAX_RATE_LIMIT_BUCKETS && !buckets.contains_key(key) {
            if let Some(oldest_key) = buckets
                .iter()
                .min_by_key(|(_, entries)| entries.first().copied().unwrap_or_else(Instant::now))
                .map(|(bucket_key, _)| bucket_key.clone())
            {
                buckets.remove(&oldest_key);
            }
        }
        let entries = buckets.entry(key.to_string()).or_default();
        entries.retain(|seen| now.duration_since(*seen) <= self.config.window);
        if entries.len() as u32 >= self.config.max_requests {
            return false;
        }
        entries.push(now);
        true
    }
}

pub fn rate_limit_client_key(request: &Request<Body>, fallback: &str) -> String {
    if rate_limit_trust_proxy_enabled() {
        if let Some(real_ip) = request
            .headers()
            .get("x-real-ip")
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            return real_ip.to_string();
        }
    }

    request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.split(',').next().unwrap_or(value).trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn rate_limit_trust_proxy_enabled() -> bool {
    std::env::var("SDKWORK_DRIVE_RATE_LIMIT_TRUST_PROXY")
        .ok()
        .map(|value| {
            let value = value.trim().to_ascii_lowercase();
            value == "1" || value == "true" || value == "on" || value == "yes"
        })
        .unwrap_or(false)
}

pub fn shared_rate_limit_state(
    init: impl FnOnce() -> RateLimitConfig,
) -> &'static SharedRateLimitState {
    static STATE: OnceLock<SharedRateLimitState> = OnceLock::new();
    STATE.get_or_init(|| SharedRateLimitState(RateLimitState::new(init())))
}

pub async fn sliding_window_rate_limit(
    state: &'static SharedRateLimitState,
    request: Request<Body>,
    next: Next,
    message: &'static str,
) -> Response {
    let client_key = rate_limit_client_key(&request, "direct-client");
    let key = format!("{client_key}:{}", request.uri().path());
    if !state.0.allow(&key) {
        sdkwork_drive_observability::metrics::record_http_rate_limited();
        return (StatusCode::TOO_MANY_REQUESTS, message).into_response();
    }
    next.run(request).await
}

pub fn rate_limit_config_from_env(
    window_env: &str,
    max_env: &str,
    default_window_seconds: u64,
    default_max_requests: u32,
) -> RateLimitConfig {
    let window_seconds = std::env::var(window_env)
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(default_window_seconds);
    let max_requests = std::env::var(max_env)
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(default_max_requests);
    RateLimitConfig {
        window: Duration::from_secs(window_seconds),
        max_requests,
    }
}
