use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use sdkwork_drive_observability::metrics;

pub async fn record_request_metrics(request: Request<Body>, next: Next) -> Response {
    metrics::record_http_request();
    let response = next.run(request).await;
    if response.status().is_server_error() {
        metrics::record_http_request_error();
    }
    response
}

pub async fn metrics_handler(service_name: &'static str) -> impl IntoResponse {
    (
        StatusCode::OK,
        [("content-type", "text/plain; version=0.0.4; charset=utf-8")],
        metrics::render_prometheus(service_name),
    )
}
