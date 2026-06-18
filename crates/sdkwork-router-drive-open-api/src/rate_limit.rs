use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
struct RateLimitState {
    window: Duration,
    max_requests: u32,
    buckets: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
}

impl RateLimitState {
    fn new(window: Duration, max_requests: u32) -> Self {
        Self {
            window,
            max_requests,
            buckets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn allow(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut buckets = self
            .buckets
            .lock()
            .expect("share link rate limit bucket lock");
        let entries = buckets.entry(key.to_string()).or_default();
        entries.retain(|instant| now.duration_since(*instant) < self.window);
        if entries.len() >= self.max_requests as usize {
            return false;
        }
        entries.push(now);
        true
    }
}

pub async fn share_link_rate_limit(request: Request<Body>, next: Next) -> Response {
    let state = share_link_rate_limit_state();
    let client_key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("direct-client");
    let key = format!("{client_key}:{}", request.uri().path());
    if !state.allow(&key) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            "share link rate limit exceeded",
        )
            .into_response();
    }
    next.run(request).await
}

fn share_link_rate_limit_state() -> &'static RateLimitState {
    static STATE: std::sync::OnceLock<RateLimitState> = std::sync::OnceLock::new();
    STATE.get_or_init(|| {
        let window_seconds = std::env::var("SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_WINDOW_SECONDS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(60);
        let max_requests = std::env::var("SDKWORK_DRIVE_OPEN_API_RATE_LIMIT_MAX_REQUESTS")
            .ok()
            .and_then(|value| value.parse::<u32>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(120);
        RateLimitState::new(Duration::from_secs(window_seconds), max_requests)
    })
}
