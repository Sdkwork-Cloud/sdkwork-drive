use std::time::Instant;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use sdkwork_drive_observability::metrics;
use tracing::Instrument;

fn span_route_template(path: &str) -> &'static str {
    if path.starts_with("/open/v3/api/drive/share_links/")
        && path.ends_with("/download_url")
    {
        return "/open/v3/api/drive/share_links/{token}/download_url";
    }
    if path.starts_with("/open/v3/api/drive/share_links/") {
        return "/open/v3/api/drive/share_links/{token}";
    }
    if path.starts_with("/app/v3/api/drive/nodes/") && path.contains("/share_links") {
        return "/app/v3/api/drive/nodes/{nodeId}/share_links";
    }
    if path.starts_with("/app/v3/api/drive/") {
        return "/app/v3/api/drive";
    }
    if path.starts_with("/backend/v3/api/drive/") {
        return "/backend/v3/api/drive";
    }
    if path == "/healthz" {
        return "/healthz";
    }
    if path == "/readyz" {
        return "/readyz";
    }
    if path == "/metrics" {
        return "/metrics";
    }
    "other"
}

pub async fn record_request_metrics(request: Request<Body>, next: Next) -> Response {
    let method = request.method().clone();
    let route_template = span_route_template(request.uri().path()).to_string();
    let deployment_mode =
        std::env::var("SDKWORK_DRIVE_DEPLOYMENT_MODE").unwrap_or_else(|_| "local".to_string());
    let runtime_profile = std::env::var("SDKWORK_DRIVE_RUNTIME_PROFILE")
        .unwrap_or_else(|_| "development".to_string());
    async move {
        let started = Instant::now();
        metrics::record_http_request();
        let response = next.run(request).await;
        metrics::record_http_request_duration(started.elapsed());
        if response.status().is_server_error() {
            metrics::record_http_request_error();
        }
        response
    }
    .instrument(tracing::info_span!(
        "drive.http.request",
        otel.name = "HTTP",
        http.request.method = %method,
        http.route = %route_template,
        deployment.profile = %deployment_mode,
        runtime.profile = %runtime_profile,
    ))
    .await
}

pub async fn metrics_handler(service_name: &'static str) -> impl IntoResponse {
    metrics::set_health_serving(true);
    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4; charset=utf-8")],
        metrics::render_prometheus(service_name),
    )
}

#[cfg(test)]
mod tests {
    use super::span_route_template;

    #[test]
    fn span_route_template_redacts_share_link_tokens() {
        assert_eq!(
            span_route_template("/open/v3/api/drive/share_links/secret-token-value"),
            "/open/v3/api/drive/share_links/{token}"
        );
        assert_eq!(
            span_route_template("/open/v3/api/drive/share_links/secret-token-value/download_url"),
            "/open/v3/api/drive/share_links/{token}/download_url"
        );
        assert_eq!(span_route_template("/healthz"), "/healthz");
    }
}
