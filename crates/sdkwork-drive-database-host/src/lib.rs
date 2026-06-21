use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_database_spi::DefaultDatabaseModule;
use sdkwork_database_sqlx::DatabasePool;

mod bootstrap;

pub use bootstrap::{bootstrap_drive_database, bootstrap_drive_database_from_env};

pub struct DriveDatabaseHost {
    pool: DatabasePool,
    module: Arc<DefaultDatabaseModule>,
}

impl DriveDatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> Arc<DefaultDatabaseModule> {
        self.module.clone()
    }
}

fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_DRIVE_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        })
}

pub(crate) fn resolve_app_root_for_bootstrap() -> PathBuf {
    resolve_app_root()
}
