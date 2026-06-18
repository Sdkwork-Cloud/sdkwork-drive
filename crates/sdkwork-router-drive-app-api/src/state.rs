use crate::constants::DEFAULT_DOWNLOAD_PUBLIC_BASE_URL;
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sqlx::AnyPool;

#[derive(Clone, Debug)]
pub struct AppState {
    pub(crate) pool: AnyPool,
    pub(crate) download_public_base_url: String,
}

impl AppState {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            pool,
            download_public_base_url: DEFAULT_DOWNLOAD_PUBLIC_BASE_URL.to_string(),
        }
    }

    pub fn with_urls(pool: AnyPool, download_public_base_url: impl Into<String>) -> Self {
        Self {
            pool,
            download_public_base_url: download_public_base_url.into(),
        }
    }

    pub fn with_urls_and_auth_policy(
        pool: AnyPool,
        download_public_base_url: impl Into<String>,
        _auth_policy: DriveAuthValidationPolicy,
    ) -> Self {
        Self::with_urls(pool, download_public_base_url)
    }
}
