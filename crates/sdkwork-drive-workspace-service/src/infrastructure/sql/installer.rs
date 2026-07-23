use std::sync::OnceLock;
use std::time::Duration;

use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use sqlx::Executor;

use sdkwork_database_config::claw_database::postgres_url_with_search_path;
use sdkwork_database_config::{
    DatabaseConfig as StandardDatabaseConfig, DatabaseEngine as StandardDatabaseEngine,
};
use sdkwork_drive_config::{DatabaseConfig, DatabaseEngine};

const SQLITE_CORE_SQL: &str = include_str!("sqlite_core.sql");
const POSTGRES_CORE_SQL: &str = include_str!("postgres_core.sql");

static DRIVE_ANY_POOL: OnceLock<AnyPool> = OnceLock::new();
static DRIVE_INSTALLED_ENGINE: OnceLock<DatabaseEngine> = OnceLock::new();

pub fn installed_database_engine() -> Option<DatabaseEngine> {
    DRIVE_INSTALLED_ENGINE.get().copied()
}

/// Resolves the SQL dialect from the concrete `AnyPool` instead of process-global state.
///
/// This keeps library callers and mixed-engine contract tests deterministic even when a
/// process owns more than one pool. Runtime installation still records the primary engine
/// for legacy transaction helpers that do not receive a pool.
pub async fn detect_any_pool_database_engine(
    pool: &AnyPool,
) -> Result<DatabaseEngine, sqlx::Error> {
    match sqlx::query_scalar::<_, String>("SELECT sqlite_version()")
        .fetch_one(pool)
        .await
    {
        Ok(_) => Ok(DatabaseEngine::Sqlite),
        Err(sqlite_probe_error) => {
            match sqlx::query_scalar::<_, String>("SELECT CAST(current_database() AS TEXT)")
                .fetch_one(pool)
                .await
            {
                Ok(_) => Ok(DatabaseEngine::Postgresql),
                Err(postgres_probe_error) => Err(sqlx::Error::Configuration(
                    format!(
                        "unsupported AnyPool database engine; SQLite probe failed: \
                         {sqlite_probe_error}; PostgreSQL probe failed: {postgres_probe_error}"
                    )
                    .into(),
                )),
            }
        }
    }
}

/// Registers the installed database engine for transaction SQL selection.
///
/// Called by schema installation and test harnesses that install schema without
/// registering the full runtime pool.
pub fn register_installed_database_engine(engine: DatabaseEngine) {
    let _ = DRIVE_INSTALLED_ENGINE.set(engine);
}

fn installed_drive_any_pool() -> Option<AnyPool> {
    DRIVE_ANY_POOL.get().cloned()
}

fn install_drive_runtime(pool: AnyPool, engine: DatabaseEngine) -> Result<(), sqlx::Error> {
    DRIVE_ANY_POOL
        .set(pool)
        .map_err(|_| sqlx::Error::Configuration("drive runtime pool already installed".into()))?;
    let _ = DRIVE_INSTALLED_ENGINE.set(engine);
    Ok(())
}

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
            if sqlite_table_exists(pool, "dr_drive_node").await? {
                upgrade_sqlite_dr_drive_node_head_columns(pool).await?;
            }
            if sqlite_table_exists(pool, "dr_drive_node_share_link").await? {
                upgrade_sqlite_dr_drive_node_share_link_access_code_column(pool).await?;
            }
            sqlx::raw_sql(SQLITE_CORE_SQL).execute(pool).await?;
            validate_sqlite_sandbox_provider_rows(pool).await?;
            upgrade_sqlite_dr_drive_node_head_columns(pool).await?;
            upgrade_sqlite_dr_drive_node_share_link_access_code_column(pool).await?;
            upgrade_sqlite_dr_drive_domain_outbox_pending_dispatch_index(pool).await?;
            upgrade_sqlite_dr_drive_maintenance_leader_table(pool).await?;
            upgrade_sqlite_dr_drive_domain_outbox_channel_delivery_table(pool).await?;
            upgrade_sqlite_dr_drive_node_space_parent_type_index(pool).await?;
        }
        DatabaseEngine::Postgresql => {
            sqlx::raw_sql(POSTGRES_CORE_SQL).execute(pool).await?;
        }
    }
    register_installed_database_engine(engine);
    Ok(())
}

async fn validate_sqlite_sandbox_provider_rows(pool: &AnyPool) -> Result<(), sqlx::Error> {
    if !sqlite_table_exists(pool, "dr_drive_sandbox_volume").await? {
        return Ok(());
    }
    let unavailable_provider_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_sandbox_volume
         WHERE provider_kind != 'local_filesystem'",
    )
    .fetch_one(pool)
    .await?;
    if unavailable_provider_count > 0 {
        return Err(sqlx::Error::Configuration(
            format!(
                "sandbox provider migration blocked: {unavailable_provider_count} volume(s) use providers without runtime adapters"
            )
            .into(),
        ));
    }
    Ok(())
}

async fn sqlite_table_exists(pool: &AnyPool, table_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = ?1")
            .bind(table_name)
            .fetch_one(pool)
            .await?;
    Ok(count > 0)
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
        let exists: i64 = sqlx::query_scalar(&format!(
            "SELECT COUNT(1) FROM pragma_table_info('dr_drive_node') WHERE name = '{column_name}'"
        ))
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
        "SELECT COUNT(1) FROM pragma_table_info('dr_drive_node_share_link') WHERE name = 'access_code_hash'",
    )
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

async fn upgrade_sqlite_dr_drive_maintenance_leader_table(
    pool: &AnyPool,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS dr_drive_maintenance_leader (
            lock_key TEXT PRIMARY KEY,
            holder_id TEXT NOT NULL,
            acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn upgrade_sqlite_dr_drive_domain_outbox_channel_delivery_table(
    pool: &AnyPool,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS dr_drive_domain_outbox_channel_delivery (
            outbox_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (outbox_id, channel_id),
            FOREIGN KEY (outbox_id) REFERENCES dr_drive_domain_outbox(id) ON DELETE CASCADE
        )",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_channel_delivery_channel
         ON dr_drive_domain_outbox_channel_delivery (channel_id, delivered_at DESC)",
    )
    .execute(pool)
    .await?;
    Ok(())
}

async fn upgrade_sqlite_dr_drive_node_space_parent_type_index(
    pool: &AnyPool,
) -> Result<(), sqlx::Error> {
    sqlx::query("DROP INDEX IF EXISTS ix_dr_drive_node_space_parent_type")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS ix_dr_drive_node_space_parent_type
         ON dr_drive_node (tenant_id, space_id, parent_node_id, head_content_type_group, updated_at DESC)
         WHERE lifecycle_status = 'active' AND node_type = 'file'",
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
    if let Some(pool) = installed_drive_any_pool() {
        return Ok(pool);
    }

    sqlx::any::install_default_drivers();
    let config = drive_database_config_with_unified_postgres_search_path(config)?;
    if sdkwork_database_sqlx::process_shared_database_pool_enabled() {
        let standard = StandardDatabaseConfig {
            engine: match config.engine() {
                DatabaseEngine::Postgresql => StandardDatabaseEngine::Postgres,
                DatabaseEngine::Sqlite => StandardDatabaseEngine::Sqlite,
            },
            url: config.url().to_owned(),
            max_connections: config.max_connections(),
            min_connections: 0,
            ..StandardDatabaseConfig::default()
        };
        return sdkwork_database_sqlx::create_any_pool_from_config(standard)
            .await
            .map_err(|error| sqlx::Error::Configuration(error.to_string().into()));
    }
    let pool = AnyPoolOptions::new()
        .max_connections(config.max_connections())
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(config.url())
        .await?;
    Ok(pool)
}

pub async fn connect_any_database_and_install_schema(
    config: &DatabaseConfig,
) -> Result<AnyPool, sqlx::Error> {
    if let Some(pool) = installed_drive_any_pool() {
        return Ok(pool);
    }

    let config = drive_database_config_with_unified_postgres_search_path(config)?;
    crate::bootstrap::bootstrap_drive_database_for_config(&config)
        .await
        .map_err(|error| sqlx::Error::Configuration(error.into()))?;
    let pool = connect_any_database(&config).await?;
    if config.engine() == DatabaseEngine::Sqlite {
        install_any_schema(&pool, config.engine()).await?;
    }
    install_drive_runtime(pool.clone(), config.engine())?;
    Ok(pool)
}
