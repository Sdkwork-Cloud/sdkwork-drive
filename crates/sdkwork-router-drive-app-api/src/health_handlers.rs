use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_http::metrics::metrics_handler;
use serde_json::json;

use crate::state::AppState;

pub(crate) async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "sdkwork-router-drive-app-api" }))
}

pub(crate) async fn ready(State(state): State<AppState>) -> (StatusCode, Json<serde_json::Value>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "status": "ready",
                "service": "sdkwork-router-drive-app-api",
                "checks": {
                    "database": "ok"
                }
            })),
        ),
        Err(error) => {
            sdkwork_drive_observability::metrics::set_health_serving(false);
            tracing::error!(
                target: "sdkwork.drive",
                error = %error,
                "readiness database check failed"
            );
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "status": "not_ready",
                    "service": "sdkwork-router-drive-app-api",
                    "checks": {
                        "database": "failed"
                    }
                })),
            )
        }
    }
}

pub(crate) async fn metrics() -> impl axum::response::IntoResponse {
    metrics_handler("sdkwork-router-drive-app-api").await
}
