//! Authored API assembly bootstrap for SDKWork Drive.
//!
//! Drive has provider-specific startup and admin-storage configuration, so this file is
//! intentionally preserved by the assembly materializer. Business surfaces mount shared
//! infrastructure exactly once at the assembly boundary.

use std::collections::BTreeSet;
use std::sync::Arc;

use axum::Router;
use sdkwork_drive_config::DatabaseConfig;
use sdkwork_drive_http::infra::{drive_service_router_config, mount_drive_infra_routes};
use sdkwork_drive_workspace_service::application::download_service::ensure_production_download_token_signing_configured;
use sdkwork_drive_workspace_service::bootstrap::bootstrap_drive_database;
use sdkwork_drive_workspace_service::infrastructure::outbox_dispatch::ensure_domain_outbox_dispatcher;
use sdkwork_drive_workspace_service::infrastructure::sql::{
    connect_any_database_and_install_schema, register_installed_database_engine,
};
use sdkwork_web_bootstrap::ReadinessCheck;
use sdkwork_web_core::{DomainContextInjector, HttpRoute, HttpRouteManifest};

pub struct ApiAssembly {
    pub router: Router,
}

pub struct ApiAssemblyContribution {
    pub router: Router,
    pub route_manifest: HttpRouteManifest,
    pub openapi: serde_json::Value,
    pub permission_catalog: Vec<&'static str>,
    pub domain_context_injectors: Vec<Arc<dyn DomainContextInjector>>,
    pub readiness_check: Arc<dyn ReadinessCheck>,
}

async fn assemble_application_business_routes(pool: sqlx::AnyPool) -> ApiAssembly {
    let mut router = Router::new();
    router = router.merge(sdkwork_routes_drive_app_api::gateway_mount_business(pool.clone()).await);
    router =
        router.merge(sdkwork_routes_drive_backend_api::gateway_mount_business(pool.clone()).await);
    router =
        router.merge(sdkwork_routes_drive_internal_api::gateway_mount_business(pool.clone()).await);
    router =
        router.merge(sdkwork_routes_drive_open_api::gateway_mount_business(pool.clone()).await);
    ApiAssembly { router }
}

pub async fn assemble_business_routes(pool: sqlx::AnyPool) -> ApiAssembly {
    let application = assemble_application_business_routes(pool.clone()).await;
    let admin_storage = sdkwork_routes_storage_backend_api::gateway_mount_business(pool).await;
    ApiAssembly {
        router: application.router.merge(admin_storage),
    }
}

pub async fn assemble_business_routes_with_config(
    pool: sqlx::AnyPool,
    admin_storage_config: sdkwork_routes_storage_backend_api::AdminStorageConfig,
) -> ApiAssembly {
    let application = assemble_application_business_routes(pool.clone()).await;
    let admin_storage = sdkwork_routes_storage_backend_api::gateway_mount_business_with_config(
        pool,
        admin_storage_config,
    )
    .await;
    ApiAssembly {
        router: application.router.merge(admin_storage),
    }
}

pub async fn assemble_business_routes_from_env() -> Result<ApiAssembly, String> {
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;
    let database_config = DatabaseConfig::from_env()
        .map_err(|error| format!("resolve drive database config failed: {error}"))?;
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .map_err(|error| format!("create drive database pool failed: {error}"))?;
    ensure_domain_outbox_dispatcher(pool.clone());
    let admin_storage_config =
        sdkwork_routes_storage_backend_api::AdminStorageConfig::from_env()
            .map_err(|error| format!("resolve admin storage config failed: {error}"))?;
    Ok(assemble_business_routes_with_config(pool, admin_storage_config).await)
}

/// Builds the raw Drive App API for a gateway-owned Web Framework layer.
pub async fn assemble_app_api_contribution() -> Result<ApiAssemblyContribution, String> {
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;
    let database_config = DatabaseConfig::from_env()
        .map_err(|error| format!("resolve drive database config failed: {error}"))?;
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .map_err(|error| format!("create drive database pool failed: {error}"))?;
    ensure_domain_outbox_dispatcher(pool.clone());

    let route_manifest = sdkwork_routes_drive_app_api::app_route_manifest();
    let router = sdkwork_routes_drive_app_api::build_app_business_router(pool.clone());
    Ok(ApiAssemblyContribution {
        router,
        openapi: sdkwork_web_contract::build_openapi_document(
            "SDKWork Drive App API",
            route_manifest.routes(),
        ),
        permission_catalog: permission_catalog(route_manifest.routes()),
        route_manifest,
        domain_context_injectors: vec![sdkwork_routes_drive_app_api::drive_app_context_injector()],
        readiness_check: Arc::new(sdkwork_drive_http::infra::AnyPoolReadinessCheck::new(pool)),
    })
}

fn permission_catalog(routes: &[HttpRoute]) -> Vec<&'static str> {
    let mut permissions = BTreeSet::new();
    for route in routes {
        if let Some(permission) = route.required_permission {
            permissions.insert(permission);
        }
        if let Some(alternate_permissions) = route.alternate_permissions {
            permissions.extend(alternate_permissions.iter().copied());
        }
    }
    permissions.into_iter().collect()
}

pub async fn assemble_business_routes_with_process_pool(
    process_pool: &sdkwork_database_sqlx::DatabasePool,
    compatibility_pool: sqlx::AnyPool,
) -> Result<ApiAssembly, String> {
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;
    bootstrap_drive_database(process_pool.clone()).await?;
    let drive_engine = if process_pool.as_postgres().is_some() {
        sdkwork_drive_config::DatabaseEngine::Postgresql
    } else {
        sdkwork_drive_config::DatabaseEngine::Sqlite
    };
    register_installed_database_engine(drive_engine);
    ensure_domain_outbox_dispatcher(compatibility_pool.clone());
    let admin_storage_config =
        sdkwork_routes_storage_backend_api::AdminStorageConfig::from_env()
            .map_err(|error| format!("resolve admin storage config failed: {error}"))?;
    Ok(assemble_business_routes_with_config(compatibility_pool, admin_storage_config).await)
}

pub async fn assemble_backend_business_router_from_env() -> Result<ApiAssembly, String> {
    sdkwork_drive_security::ensure_drive_auth_policy_refresh_task();
    ensure_production_download_token_signing_configured()
        .map_err(|error| format!("download token signing config invalid: {error}"))?;
    let database_config = DatabaseConfig::from_env()
        .map_err(|error| format!("resolve drive database config failed: {error}"))?;
    let pool = connect_any_database_and_install_schema(&database_config)
        .await
        .map_err(|error| format!("create drive database pool failed: {error}"))?;
    ensure_domain_outbox_dispatcher(pool.clone());
    let admin_storage_config =
        sdkwork_routes_storage_backend_api::AdminStorageConfig::from_env()
            .map_err(|error| format!("resolve admin storage config failed: {error}"))?;
    let drive_backend =
        sdkwork_routes_drive_backend_api::gateway_mount_business(pool.clone()).await;
    let admin_storage = sdkwork_routes_storage_backend_api::gateway_mount_business_with_config(
        pool,
        admin_storage_config,
    )
    .await;
    Ok(ApiAssembly {
        router: drive_backend.merge(admin_storage),
    })
}

pub async fn assemble_api_router(pool: sqlx::AnyPool) -> ApiAssembly {
    let business = assemble_business_routes(pool.clone()).await;
    let router = mount_drive_infra_routes(
        business.router,
        drive_service_router_config(&pool),
        Some("sdkwork-api-drive-assembly"),
    );
    ApiAssembly { router }
}
