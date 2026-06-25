mod config;
mod iam_application_bootstrap;

use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{any, get},
    Router,
};
use config::{
    load_gateway_config, resolve_config_path, resolve_gateway_config, ResolvedGatewayConfig,
};
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_http::metrics::metrics_handler;
use sdkwork_drive_workspace_service::application::download_service::ensure_production_download_token_signing_configured;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::ensure_domain_outbox_dispatcher;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sdkwork_router_drive_app_api::build_protected_router_with_pool as build_app_router_with_pool_and_iam;
use sdkwork_router_drive_backend_api::build_protected_router_with_pool as build_backend_router_with_pool_and_iam;
use sdkwork_router_drive_open_api::build_protected_router_with_pool as build_open_router_with_pool;
use sdkwork_router_storage_backend_api::{
    build_protected_router_with_pool_and_config as build_admin_storage_router_with_pool,
    AdminStorageConfig,
};
use tower::ServiceExt;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct GatewayHealthState {
    pool: sqlx::AnyPool,
}

#[derive(Clone)]
struct EmbeddedServiceState {
    service: Router,
    service_label: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sdkwork_drive_observability::init_tracing("sdkwork-drive-standalone-gateway");
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;

    let args: Vec<String> = std::env::args().collect();
    let config_path = resolve_config_path(&args)?;
    let file_config = load_gateway_config(std::path::Path::new(&config_path))
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    let gateway_config = resolve_gateway_config(file_config)
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    let database_config = DatabaseConfig::from_env_and_cli_args(&args)
        .map_err(|error| format!("resolve drive database config failed: {error}"))?;
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .map_err(|error| format!("create drive database pool failed: {error}"))?;
    ensure_domain_outbox_dispatcher(pool.clone());
    let health_state = GatewayHealthState {
        pool: pool.clone(),
    };

    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| format!("failed to bootstrap IAM database lifecycle: {error}"))?;
    iam_application_bootstrap::ensure_drive_tenant_application_bootstrap(
        gateway_config.environment.as_str(),
    )
    .await
    .map_err(|error| format!("failed to ensure drive IAM tenant application: {error}"))?;

    let iam_router = sdkwork_router_iam_app_api::build_sdkwork_iam_app_api_router()
        .await
        .map_err(|error| format!("failed to build embedded IAM router: {error}"))?;
    let admin_storage_config = AdminStorageConfig::from_env()
        .map_err(|error| format!("resolve admin storage config failed: {error}"))?;
    let app_api_router = Arc::new(EmbeddedServiceState {
        service: build_app_router_with_pool_and_iam(pool.clone()).await,
        service_label: "sdkwork-drive-app-api".to_string(),
    });
    let backend_api_router = Arc::new(EmbeddedServiceState {
        service: build_backend_router_with_pool_and_iam(pool.clone()).await,
        service_label: "sdkwork-drive-backend-api".to_string(),
    });
    let open_api_router = Arc::new(EmbeddedServiceState {
        service: build_open_router_with_pool(pool.clone()).await,
        service_label: "sdkwork-drive-open-api".to_string(),
    });
    let admin_storage_router = Arc::new(EmbeddedServiceState {
        service: build_admin_storage_router_with_pool(pool, admin_storage_config).await,
        service_label: "sdkwork-drive-admin-storage-api".to_string(),
    });

    let health_router = Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/readyz", get(ready))
        .route("/metrics", get(gateway_metrics))
        .with_state(health_state);

    let app = Router::new()
        .merge(health_router)
        .route(
            "/app/v3/api/{*rest}",
            any(dispatch_embedded).with_state(app_api_router.clone()),
        )
        .route(
            "/app/v3/api",
            any(dispatch_embedded).with_state(app_api_router),
        )
        .route(
            "/backend/v3/api/drive/storage/{*rest}",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/backend/v3/api/drive/storage",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/backend/v3/api/{*rest}",
            any(dispatch_embedded).with_state(backend_api_router.clone()),
        )
        .route(
            "/backend/v3/api",
            any(dispatch_embedded).with_state(backend_api_router),
        )
        .route(
            "/open/v3/api/{*rest}",
            any(dispatch_embedded).with_state(open_api_router.clone()),
        )
        .route(
            "/open/v3/api",
            any(dispatch_embedded).with_state(open_api_router),
        )
        .route(
            "/admin/v3/api/{*rest}",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/admin/v3/api",
            any(dispatch_embedded).with_state(admin_storage_router),
        )
        .merge(iam_router)
        .layer(build_cors_layer(&gateway_config));

    let bind_addr: std::net::SocketAddr = gateway_config
        .bind
        .parse()
        .map_err(|error| format!("invalid bind address `{}`: {error}", gateway_config.bind))?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    tracing::info!(
        target: "sdkwork.drive",
        event = "drive.http.listen",
        service = %gateway_config.service_name,
        environment = %gateway_config.environment,
        bind = %bind_addr,
        "listening"
    );
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn build_cors_layer(config: &ResolvedGatewayConfig) -> CorsLayer {
    if config.allow_any_origin {
        return CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);
    }

    let mut layer = CorsLayer::new().allow_methods(Any).allow_headers(Any);
    for origin in &config.allowed_origins {
        if let Ok(parsed) = origin.parse::<axum::http::HeaderValue>() {
            layer = layer.allow_origin(parsed);
        }
    }
    layer
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install terminate signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}

async fn dispatch_embedded(
    State(state): State<Arc<EmbeddedServiceState>>,
    request: Request,
) -> Response {
    match state.service.clone().oneshot(request).await {
        Ok(response) => response,
        Err(error) => proxy_error(
            StatusCode::BAD_GATEWAY,
            format!("embedded `{}` request failed: {error}", state.service_label),
        ),
    }
}

fn proxy_error(status: StatusCode, detail: String) -> Response {
    let body = serde_json::json!({
        "title": "drive_standalone_gateway_proxy_error",
        "detail": detail,
    });
    (status, axum::Json(body)).into_response()
}

async fn ready(
    State(state): State<GatewayHealthState>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({
                "status": "ready",
                "service": "sdkwork-drive-standalone-gateway",
                "checks": { "database": "ok" }
            })),
        ),
        Err(error) => {
            tracing::error!(
                target: "sdkwork.drive",
                error = %error,
                "standalone gateway readiness database check failed"
            );
            (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(serde_json::json!({
                    "status": "not_ready",
                    "service": "sdkwork-drive-standalone-gateway",
                    "checks": { "database": "failed" }
                })),
            )
        }
    }
}

async fn gateway_metrics() -> impl IntoResponse {
    metrics_handler("sdkwork-drive-standalone-gateway").await
}
