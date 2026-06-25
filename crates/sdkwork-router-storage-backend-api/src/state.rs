use crate::config::AdminStorageConfig;
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
}
