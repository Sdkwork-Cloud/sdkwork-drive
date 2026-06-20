//! SDKWork Drive database pool bootstrap via `sdkwork-database`.

use sdkwork_database_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};
use sdkwork_drive_config::DatabaseConfig as DriveDatabaseConfig;

pub use sdkwork_drive_database_host::{
    bootstrap_drive_database, bootstrap_drive_database_from_env, DriveDatabaseHost,
};

pub async fn bootstrap_drive_database_for_config(
    config: &DriveDatabaseConfig,
) -> Result<DriveDatabaseHost, String> {
    let sdk_config = drive_database_config_to_sdkwork(config)?;
    let pool = create_pool_from_config(sdk_config)
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_drive_database(pool).await
}

pub async fn connect_drive_database_pool_from_env() -> Result<DatabasePool, PoolError> {
    let config = DatabaseConfig::from_env("DRIVE")?;
    create_pool_from_config(config).await
}

fn drive_database_config_to_sdkwork(
    config: &DriveDatabaseConfig,
) -> Result<DatabaseConfig, String> {
    use sdkwork_drive_config::DatabaseEngine as DriveEngine;

    let engine = match config.engine() {
        DriveEngine::Postgresql => DatabaseEngine::Postgres,
        DriveEngine::Sqlite => DatabaseEngine::Sqlite,
    };

    Ok(DatabaseConfig {
        engine,
        url: config.url().to_string(),
        max_connections: config.max_connections(),
        ..Default::default()
    })
}
