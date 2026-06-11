use sdkwork_drive_app_api::build_router_with_database_config;
use sdkwork_drive_config::DatabaseConfig;

#[tokio::test]
async fn app_runtime_accepts_sqlite_database_config() {
    let config = DatabaseConfig::from_url_with_max_connections("sqlite::memory:", 1)
        .expect("sqlite config should parse");

    let _router = build_router_with_database_config(&config)
        .await
        .expect("sqlite database config should build app router");
}

#[tokio::test]
async fn app_runtime_routes_postgres_to_postgres_runtime() {
    let config = DatabaseConfig::from_url_with_max_connections(
        "postgresql://sdkwork_drive:secret@127.0.0.1:1/sdkwork_drive",
        5,
    )
    .expect("postgres config should parse");

    let error = build_router_with_database_config(&config)
        .await
        .expect_err("postgres connection is intentionally unavailable in this unit test");

    assert!(
        !error
            .to_string()
            .contains("currently supports SQLite runtime only"),
        "unexpected error: {error}"
    );
}
