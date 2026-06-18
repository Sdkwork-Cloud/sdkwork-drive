mod config;

use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{any, get},
    Router,
};
use axum07::body::Body as Body07;
use axum07::Router as Router07;
use config::{
    load_gateway_config, resolve_config_path, resolve_gateway_config, ResolvedGatewayConfig,
};
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sdkwork_router_drive_app_api::build_router_with_pool_and_iam as build_app_router_with_pool_and_iam;
use sdkwork_router_drive_backend_api::build_router_with_pool_and_iam as build_backend_router_with_pool_and_iam;
use sdkwork_router_drive_open_api::build_router_with_pool;
use sdkwork_router_storage_backend_api::build_router_with_pool as build_admin_storage_router_with_pool;
use tower::ServiceExt;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct EmbeddedServiceState {
    service: Router07,
    service_label: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt::init();
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();

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

    let iam_router = sdkwork_router_iam_app_api::build_sdkwork_appbase_app_api_router()
        .await
        .map_err(|error| format!("failed to build embedded IAM router: {error}"))?;
    let app_api_router = Arc::new(EmbeddedServiceState {
        service: build_app_router_with_pool_and_iam(pool.clone()),
        service_label: "sdkwork-drive-app-api".to_string(),
    });
    let backend_api_router = Arc::new(EmbeddedServiceState {
        service: build_backend_router_with_pool_and_iam(pool.clone()),
        service_label: "sdkwork-drive-backend-api".to_string(),
    });
    let open_api_router = Arc::new(EmbeddedServiceState {
        service: build_router_with_pool(pool.clone()),
        service_label: "sdkwork-drive-open-api".to_string(),
    });
    let admin_storage_router = Arc::new(EmbeddedServiceState {
        service: build_admin_storage_router_with_pool(pool),
        service_label: "sdkwork-drive-admin-storage-api".to_string(),
    });

    let app = Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route(
            "/app/v3/api/{*rest}",
            any(dispatch_embedded).with_state(app_api_router.clone()),
        )
        .route(
            "/app/v3/api",
            any(dispatch_embedded).with_state(app_api_router),
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
    let (request_parts, request_body) = request.into_parts();
    let request_bytes = match axum::body::to_bytes(request_body, usize::MAX).await {
        Ok(body) => body,
        Err(error) => {
            return proxy_error(
                StatusCode::BAD_GATEWAY,
                format!(
                    "embedded `{}` request body failed: {error}",
                    state.service_label
                ),
            );
        }
    };
    let request07 = http::Request::from_parts(request_parts, Body07::from(request_bytes));
    match state.service.clone().oneshot(request07).await {
        Ok(response07) => {
            let (response_parts, response_body07) = response07.into_parts();
            let response_bytes = match axum07::body::to_bytes(response_body07, usize::MAX).await {
                Ok(body) => body,
                Err(error) => {
                    return proxy_error(
                        StatusCode::BAD_GATEWAY,
                        format!(
                            "embedded `{}` response body failed: {error}",
                            state.service_label
                        ),
                    );
                }
            };
            Response::from_parts(response_parts, axum::body::Body::from(response_bytes))
        }
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
