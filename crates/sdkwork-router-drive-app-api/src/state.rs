use crate::auth::drive_auth_policy_from_env;
use crate::constants::DEFAULT_DOWNLOAD_PUBLIC_BASE_URL;
use sdkwork_drive_security::{DriveAuthPolicyHandle, DriveAuthValidationPolicy};
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AppState {
    pub(crate) pool: AnyPool,
    pub(crate) download_public_base_url: String,
    pub(crate) auth_policy: DriveAuthPolicyHandle,
}

impl AppState {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            pool,
            download_public_base_url: DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string(),
            auth_policy: drive_auth_policy_from_env(),
        }
    }

    pub fn with_urls(pool: AnyPool, download_public_base_url: impl Into<String>) -> Self {
        Self {
            pool,
            download_public_base_url: download_public_base_url.into(),
            auth_policy: drive_auth_policy_from_env(),
        }
    }

    pub fn with_urls_and_auth_policy(
        pool: AnyPool,
        download_public_base_url: impl Into<String>,
        auth_policy: DriveAuthValidationPolicy,
    ) -> Self {
        Self {
            pool,
            download_public_base_url: download_public_base_url.into(),
            auth_policy: DriveAuthPolicyHandle::from_policy(auth_policy),
        }
    }
}
