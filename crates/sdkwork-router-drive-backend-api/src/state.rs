use crate::auth::drive_auth_policy_from_env;
use sdkwork_drive_security::{DriveAuthPolicyHandle, DriveAuthValidationPolicy};
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct BackendState {
    pub(crate) pool: AnyPool,
    pub(crate) auth_policy: DriveAuthPolicyHandle,
}

impl BackendState {
    pub(crate) fn new(pool: AnyPool) -> Self {
        Self {
            pool,
            auth_policy: drive_auth_policy_from_env(),
        }
    }

    pub(crate) fn with_auth_policy(pool: AnyPool, auth_policy: DriveAuthValidationPolicy) -> Self {
        Self {
            pool,
            auth_policy: DriveAuthPolicyHandle::from_policy(auth_policy),
        }
    }
}
