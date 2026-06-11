use crate::auth::drive_auth_policy_from_env;
use crate::config::AdminStorageConfig;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Debug, Clone)]
pub struct AdminStorageState {
    pub(crate) pool: AnyPool,
    pub(crate) config: AdminStorageConfig,
    pub(crate) auth_policy: DriveAuthValidationPolicy,
}

impl AdminStorageState {
    pub(crate) fn new(pool: AnyPool, config: AdminStorageConfig) -> Self {
        Self {
            pool,
            config,
            auth_policy: drive_auth_policy_from_env(),
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
