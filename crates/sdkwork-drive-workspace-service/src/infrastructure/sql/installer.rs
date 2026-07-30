use sqlx::{Executor, PgPool};

use sdkwork_drive_config::DatabaseConfig;

const POSTGRES_CORE_SQL: &str = include_str!("postgres_core.sql");

pub async fn install_postgres_schema<'c, E>(executor: E) -> Result<(), sqlx::Error>
where
    E: Executor<'c, Database = sqlx::Postgres>,
{
    sqlx::raw_sql(POSTGRES_CORE_SQL).execute(executor).await?;
    Ok(())
}

pub fn postgres_pool_from_database_pool(
    pool: &sdkwork_database_sqlx::DatabasePool,
) -> Result<PgPool, String> {
    pool.as_postgres().cloned().ok_or_else(|| {
        "Drive authoritative server requires the process-shared PostgreSQL pool".to_string()
    })
}

pub async fn connect_postgres_database_and_install_schema(
    config: &DatabaseConfig,
) -> Result<PgPool, sqlx::Error> {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    let host = crate::bootstrap::bootstrap_drive_database_for_config(config)
        .await
        .map_err(|error| sqlx::Error::Configuration(error.into()))?;
    postgres_pool_from_database_pool(host.pool())
        .map_err(|error| sqlx::Error::Configuration(error.into()))
}
