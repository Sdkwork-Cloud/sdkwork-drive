use crate::config::AdminStorageConfig;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AdminStorageState {
    pub(crate) pool: AnyPool,
    pub(crate) config: AdminStorageConfig,
}

impl AdminStorageState {
    pub(crate) fn new(pool: AnyPool, config: AdminStorageConfig) -> Self {
        Self { pool, config }
    }

    pub(crate) fn with_auth_policy(
        pool: AnyPool,
        config: AdminStorageConfig,
        _auth_policy: DriveAuthValidationPolicy,
    ) -> Self {
        Self::new(pool, config)
    }
}
