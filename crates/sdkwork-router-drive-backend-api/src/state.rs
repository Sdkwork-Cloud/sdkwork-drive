use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct BackendState {
    pub(crate) pool: AnyPool,
}

impl BackendState {
    pub(crate) fn new(pool: AnyPool) -> Self {
        Self { pool }
    }

    pub(crate) fn with_auth_policy(pool: AnyPool, _auth_policy: DriveAuthValidationPolicy) -> Self {
        Self::new(pool)
    }
}
