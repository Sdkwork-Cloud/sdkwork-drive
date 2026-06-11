use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use sqlx::Executor;

use sdkwork_drive_config::{DatabaseConfig, DatabaseEngine};

const SQLITE_CORE_SQL: &str = include_str!("sqlite_core.sql");
const POSTGRES_CORE_SQL: &str = include_str!("postgres_core.sql");

pub async fn install_sqlite_schema<'c, E>(executor: E) -> Result<(), sqlx::Error>
where
    E: Executor<'c, Database = sqlx::Sqlite>,
{
    sqlx::raw_sql(SQLITE_CORE_SQL).execute(executor).await?;
    Ok(())
}

pub async fn install_postgres_schema<'c, E>(executor: E) -> Result<(), sqlx::Error>
where
    E: Executor<'c, Database = sqlx::Postgres>,
{
    sqlx::raw_sql(POSTGRES_CORE_SQL).execute(executor).await?;
    Ok(())
}

pub async fn install_any_schema(pool: &AnyPool, engine: DatabaseEngine) -> Result<(), sqlx::Error> {
    sqlx::any::install_default_drivers();
    match engine {
        DatabaseEngine::Sqlite => {
            sqlx::raw_sql(SQLITE_CORE_SQL).execute(pool).await?;
        }
        DatabaseEngine::Postgresql => {
            sqlx::raw_sql(POSTGRES_CORE_SQL).execute(pool).await?;
        }
    }
    Ok(())
}

pub async fn connect_any_database(config: &DatabaseConfig) -> Result<AnyPool, sqlx::Error> {
    sqlx::any::install_default_drivers();
    AnyPoolOptions::new()
        .max_connections(config.max_connections())
        .connect(config.url())
        .await
}

pub async fn connect_any_database_and_install_schema(
    config: &DatabaseConfig,
) -> Result<AnyPool, sqlx::Error> {
    let pool = connect_any_database(config).await?;
    install_any_schema(&pool, config.engine()).await?;
    Ok(pool)
}
