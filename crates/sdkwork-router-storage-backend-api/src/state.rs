use crate::auth::drive_auth_policy_from_env;
use crate::config::AdminStorageConfig;
use sdkwork_drive_security::{DriveAuthPolicyHandle, DriveAuthValidationPolicy};
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AdminStorageState {
    pub(crate) pool: AnyPool,
    pub(crate) config: AdminStorageConfig,
    pub(crate) auth_policy: DriveAuthPolicyHandle,
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
            auth_policy: DriveAuthPolicyHandle::from_policy(auth_policy),
        }
    }
}
