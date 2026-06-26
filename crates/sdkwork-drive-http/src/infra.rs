//! Infrastructure routes (`/healthz`, `/livez`, `/readyz`, `/metrics`) via sdkwork-web-bootstrap.

use std::sync::Arc;

use axum::Router;
use sdkwork_web_bootstrap::{
    infra_public_path_prefixes, mount_infra_routes, ReadinessCheck, ReadinessFuture,
    ServiceRouterConfig,
};
use sqlx::AnyPool;

/// Readiness probe for Drive `sqlx::AnyPool` databases.
#[derive(Clone)]
pub struct AnyPoolReadinessCheck {
    pool: AnyPool,
}

impl AnyPoolReadinessCheck {
    pub fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}

impl ReadinessCheck for AnyPoolReadinessCheck {
    fn check(&self) -> ReadinessFuture<'_> {
        let pool = self.pool.clone();
        Box::pin(async move {
            sqlx::query("SELECT 1")
                .execute(&pool)
                .await
                .map_err(|error| error.to_string())?;
            Ok(())
        })
    }
}

/// Builds a [`ServiceRouterConfig`] with database readiness for the given pool.
pub fn drive_service_router_config(pool: &AnyPool) -> ServiceRouterConfig {
    ServiceRouterConfig::default().with_readiness_check(Arc::new(AnyPoolReadinessCheck::new(
        pool.clone(),
    )))
}

/// Mounts standard infrastructure routes on `router`.
pub fn mount_drive_infra_routes<S>(router: Router<S>, config: ServiceRouterConfig) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    mount_infra_routes(router, config)
}

/// Canonical public infrastructure path prefixes for Drive web framework profiles.
pub fn drive_infra_public_path_prefixes() -> Vec<String> {
    infra_public_path_prefixes()
}
