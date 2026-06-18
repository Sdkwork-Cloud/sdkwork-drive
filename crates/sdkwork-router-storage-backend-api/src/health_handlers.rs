use axum::Json;
use sdkwork_drive_http::metrics::metrics_handler;
use serde_json::json;

pub(crate) async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "sdkwork-router-storage-backend-api"
    }))
}

pub(crate) async fn metrics() -> impl axum::response::IntoResponse {
    metrics_handler("sdkwork-router-storage-backend-api").await
}
