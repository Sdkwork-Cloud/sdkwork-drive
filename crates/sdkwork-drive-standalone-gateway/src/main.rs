mod config;
mod iam_application_bootstrap;

use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::any,
    Router,
};
use config::{
    load_gateway_config, resolve_config_path, resolve_gateway_config, web_framework_env_projection,
};
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_workspace_service::application::download_service::ensure_production_download_token_signing_configured;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::ensure_domain_outbox_dispatcher;
use sdkwork_drive_workspace_service::infrastructure::sql::connect_any_database_and_install_schema;
use sdkwork_routes_storage_backend_api::{
    build_protected_router_with_pool_and_config as build_admin_storage_router_with_pool,
    AdminStorageConfig,
};
use tower::ServiceExt;

/// Maximum request body size: 32 MB.
/// Requests exceeding this limit receive a 413 Payload Too Large response.
const MAX_REQUEST_BODY_BYTES: usize = 32 * 1024 * 1024;

#[derive(Clone)]
struct EmbeddedServiceState {
    service: Router,
    service_label: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sdkwork_drive_workspace_service::enable_process_shared_database_pool();
    sdkwork_drive_observability::init_tracing("sdkwork-drive-standalone-gateway");

    let args: Vec<String> = std::env::args().collect();
    let config_path = resolve_config_path(&args)?;
    let file_config = load_gateway_config(std::path::Path::new(&config_path))
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    let gateway_config = resolve_gateway_config(file_config)
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    for (key, value) in web_framework_env_projection(&gateway_config) {
        std::env::set_var(key, value);
    }

    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;
    let database_config = DatabaseConfig::from_env_and_cli_args(&args)
        .map_err(|error| format!("resolve drive database config failed: {error}"))?;
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .map_err(|error| format!("create drive database pool failed: {error}"))?;
    ensure_domain_outbox_dispatcher(pool.clone());

    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| format!("failed to bootstrap IAM database lifecycle: {error}"))?;
    iam_application_bootstrap::ensure_drive_tenant_application_bootstrap(
        gateway_config.environment.as_str(),
    )
    .await
    .map_err(|error| format!("failed to ensure drive IAM tenant application: {error}"))?;

    let iam_router = sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router()
        .await
        .map_err(|error| format!("failed to build embedded IAM router: {error}"))?;
    let admin_storage_config = AdminStorageConfig::from_env()
        .map_err(|error| format!("resolve admin storage config failed: {error}"))?;
    let application =
        sdkwork_drive_gateway_assembly::assemble_application_router(pool.clone()).await;
    let admin_storage_router = Arc::new(EmbeddedServiceState {
        service: build_admin_storage_router_with_pool(pool, admin_storage_config).await,
        service_label: "sdkwork-drive-admin-storage-api".to_string(),
    });

    let app = Router::new()
        .merge(application.router)
        .layer(axum::extract::DefaultBodyLimit::max(MAX_REQUEST_BODY_BYTES))
        .route(
            "/backend/v3/api/drive/storage/{*rest}",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/backend/v3/api/drive/storage",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/admin/v3/api/{*rest}",
            any(dispatch_embedded).with_state(admin_storage_router.clone()),
        )
        .route(
            "/admin/v3/api",
            any(dispatch_embedded).with_state(admin_storage_router),
        )
        .merge(iam_router);

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
