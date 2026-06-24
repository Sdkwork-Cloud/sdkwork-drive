use crate::constants::DEFAULT_DOWNLOAD_PUBLIC_BASE_URL;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AppState {
    pub(crate) pool: AnyPool,
    pub(crate) download_public_base_url: String,
    /// Retained for test harness contracts; HTTP auth is enforced by sdkwork-web-core.
    #[allow(dead_code)]
    pub(crate) auth_policy: DriveAuthValidationPolicy,
}

impl AppState {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            pool,
            download_public_base_url: DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string(),
            auth_policy: DriveAuthValidationPolicy::default(),
        }
    }

    pub fn with_urls(pool: AnyPool, download_public_base_url: impl Into<String>) -> Self {
        Self {
            pool,
            download_public_base_url: download_public_base_url.into(),
            auth_policy: DriveAuthValidationPolicy::default(),
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
            auth_policy,
        }
    }
}
