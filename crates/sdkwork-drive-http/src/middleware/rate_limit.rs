use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

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
        let mut buckets = self
            .buckets
            .lock()
            .expect("drive rate limit bucket lock");
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
    request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| fallback.to_string())
}

pub fn shared_rate_limit_state(init: impl FnOnce() -> RateLimitConfig) -> &'static SharedRateLimitState {
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
