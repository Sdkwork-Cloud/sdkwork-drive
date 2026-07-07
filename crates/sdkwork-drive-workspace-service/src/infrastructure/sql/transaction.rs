use sdkwork_drive_config::{DatabaseConfig, DatabaseEngine};

use super::installer::installed_database_engine;

/// Returns the SQL statement that starts a write transaction for the given engine.
pub fn begin_transaction_sql_for_engine(engine: DatabaseEngine) -> &'static str {
    match engine {
        DatabaseEngine::Sqlite => "BEGIN IMMEDIATE",
        DatabaseEngine::Postgresql => "BEGIN",
    }
}

/// Returns the SQL statement that starts a write transaction for the installed engine.
pub fn begin_transaction_sql() -> &'static str {
    begin_transaction_sql_for_engine(resolve_installed_database_engine())
}

fn resolve_installed_database_engine() -> DatabaseEngine {
    installed_database_engine().unwrap_or_else(|| {
        DatabaseConfig::from_env()
            .map(|config| config.engine())
            .unwrap_or(DatabaseEngine::Postgresql)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn begin_transaction_sql_for_engine_matches_engine_semantics() {
        assert_eq!(
            begin_transaction_sql_for_engine(DatabaseEngine::Sqlite),
            "BEGIN IMMEDIATE"
        );
        assert_eq!(
            begin_transaction_sql_for_engine(DatabaseEngine::Postgresql),
            "BEGIN"
        );
    }
}
