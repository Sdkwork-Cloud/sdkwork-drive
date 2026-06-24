use crate::config::AdminStorageConfig;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AdminStorageState {
    pub(crate) pool: AnyPool,
    pub(crate) config: AdminStorageConfig,
    /// Retained for test harness contracts; HTTP auth is enforced by sdkwork-web-core.
    #[allow(dead_code)]
    pub(crate) auth_policy: DriveAuthValidationPolicy,
}

impl AdminStorageState {
    pub(crate) fn new(pool: AnyPool, config: AdminStorageConfig) -> Self {
        Self {
            pool,
            config,
            auth_policy: DriveAuthValidationPolicy::default(),
        }
    }

    pub(crate) fn with_auth_policy(
        pool: AnyPool,
        config: AdminStorageConfig,
        auth_policy: DriveAuthValidationPolicy,
    ) -> Self {
        Self {
            pool,
            config,
            auth_policy,
        }
    }
}
