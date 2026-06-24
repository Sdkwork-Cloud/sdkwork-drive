use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct BackendState {
    pub(crate) pool: AnyPool,
    /// Retained for test harness contracts; HTTP auth is enforced by sdkwork-web-core.
    #[allow(dead_code)]
    pub(crate) auth_policy: DriveAuthValidationPolicy,
}

impl BackendState {
    pub(crate) fn new(pool: AnyPool) -> Self {
        Self {
            pool,
            auth_policy: DriveAuthValidationPolicy::default(),
        }
    }

    pub(crate) fn with_auth_policy(pool: AnyPool, auth_policy: DriveAuthValidationPolicy) -> Self {
        Self { pool, auth_policy }
    }
}
