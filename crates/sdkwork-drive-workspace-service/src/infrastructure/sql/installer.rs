use std::time::Duration;

use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use sqlx::Executor;

use sdkwork_database_config::claw_database::postgres_url_with_search_path;
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
            upgrade_sqlite_dr_drive_node_head_columns(pool).await?;
            upgrade_sqlite_dr_drive_node_share_link_access_code_column(pool).await?;
            upgrade_sqlite_dr_drive_domain_outbox_pending_dispatch_index(pool).await?;
        }
        DatabaseEngine::Postgresql => {
            sqlx::raw_sql(POSTGRES_CORE_SQL).execute(pool).await?;
        }
    }
    Ok(())
}

async fn upgrade_sqlite_dr_drive_node_head_columns(pool: &AnyPool) -> Result<(), sqlx::Error> {
    const COLUMNS: [(&str, &str); 7] = [
        ("content_state", "TEXT NOT NULL DEFAULT 'empty'"),
        ("file_extension", "TEXT"),
        ("head_content_type", "TEXT"),
        ("head_content_type_group", "TEXT"),
        ("head_content_length", "INTEGER"),
        ("head_version_no", "INTEGER"),
        ("head_checksum_sha256_hex", "TEXT"),
    ];

    for (column_name, column_ddl) in COLUMNS {
        let exists: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM pragma_table_info('dr_drive_node') WHERE name = ?",
        )
        .bind(column_name)
        .fetch_one(pool)
        .await?;
        if exists == 0 {
            let statement =
                format!("ALTER TABLE dr_drive_node ADD COLUMN {column_name} {column_ddl}");
            sqlx::query(&statement).execute(pool).await?;
        }
    }

    Ok(())
}

async fn upgrade_sqlite_dr_drive_node_share_link_access_code_column(
    pool: &AnyPool,
) -> Result<(), sqlx::Error> {
    let exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM pragma_table_info('dr_drive_node_share_link') WHERE name = ?",
    )
    .bind("access_code_hash")
    .fetch_one(pool)
    .await?;
    if exists == 0 {
        sqlx::query("ALTER TABLE dr_drive_node_share_link ADD COLUMN access_code_hash TEXT")
            .execute(pool)
            .await?;
    }
    Ok(())
}

async fn upgrade_sqlite_dr_drive_domain_outbox_pending_dispatch_index(
    pool: &AnyPool,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_pending_dispatch
         ON dr_drive_domain_outbox (attempt_count, created_at)
         WHERE delivery_status = 'pending'",
    )
    .execute(pool)
    .await?;
    Ok(())
}

fn drive_database_config_with_unified_postgres_search_path(
    config: &DatabaseConfig,
) -> Result<DatabaseConfig, sqlx::Error> {
    if config.engine() != DatabaseEngine::Postgresql {
        return Ok(config.clone());
    }

    let url = postgres_url_with_search_path(config.url(), "SDKWORK_DRIVE");
    DatabaseConfig::from_url_with_max_connections(url.as_str(), config.max_connections())
        .map_err(|error| sqlx::Error::Configuration(error.to_string().into()))
}

pub async fn connect_any_database(config: &DatabaseConfig) -> Result<AnyPool, sqlx::Error> {
    sqlx::any::install_default_drivers();
    let config = drive_database_config_with_unified_postgres_search_path(config)?;
    AnyPoolOptions::new()
        .max_connections(config.max_connections())
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(config.url())
        .await
}

pub async fn connect_any_database_and_install_schema(
    config: &DatabaseConfig,
) -> Result<AnyPool, sqlx::Error> {
    let config = drive_database_config_with_unified_postgres_search_path(config)?;
    let pool = connect_any_database(&config).await?;
    match config.engine() {
        DatabaseEngine::Postgresql => {
            crate::bootstrap::bootstrap_drive_database_for_config(&config)
                .await
                .map_err(|error| sqlx::Error::Configuration(error.into()))?;
        }
        DatabaseEngine::Sqlite => {
            install_any_schema(&pool, config.engine()).await?;
        }
    }
    Ok(pool)
}
