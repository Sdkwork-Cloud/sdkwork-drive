use sqlx::Executor;

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
