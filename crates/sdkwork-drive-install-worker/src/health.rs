use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde_json::json;
use sqlx::AnyPool;
use std::net::SocketAddr;

#[derive(Clone)]
struct HealthState {
    pool: AnyPool,
}

pub async fn spawn_install_worker_health_server(
    pool: AnyPool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let bind = std::env::var("SDKWORK_DRIVE_INSTALL_WORKER_HEALTH_BIND")
        .unwrap_or_else(|_| "127.0.0.1:18084".to_string());
    let addr: SocketAddr = bind
        .parse()
        .map_err(|error| format!("invalid install worker health bind `{bind}`: {error}"))?;

    let app = Router::new()
        .route("/healthz", get(health))
        .route("/readyz", get(ready))
        .with_state(HealthState { pool });

    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!(
        target: "sdkwork.drive",
        event = "drive.install_worker.health_listen",
        bind = %addr,
        "install worker health server listening"
    );
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "sdkwork-drive-install-worker"
    }))
}

async fn ready(
    State(state): State<HealthState>,
) -> (StatusCode, Json<serde_json::Value>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "status": "ready",
                "service": "sdkwork-drive-install-worker",
                "checks": {
                    "database": "ok"
                }
            })),
        ),
        Err(error) => {
            sdkwork_drive_observability::metrics::set_health_serving(false);
            tracing::error!(
                target: "sdkwork.drive",
                event = "drive.install_worker.readiness_failed",
                error = %error,
                "install worker readiness database check failed"
            );
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "status": "not_ready",
                    "service": "sdkwork-drive-install-worker",
                    "checks": {
                        "database": "failed"
                    }
                })),
            )
        }
    }
}
