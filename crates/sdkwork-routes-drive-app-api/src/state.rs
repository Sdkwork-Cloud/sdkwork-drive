use crate::constants::DEFAULT_DOWNLOAD_PUBLIC_BASE_URL;
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
}
