use sdkwork_drive_config::{DatabaseConfig, DatabaseEngine};
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn parses_sqlite_database_urls_for_local_mode() {
    let config = DatabaseConfig::from_url_with_max_connections(
        "sqlite://target/dev/sdkwork-drive.sqlite",
        1,
    )
    .expect("sqlite database url should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/sdkwork-drive.sqlite", config.url());
    assert_eq!(1, config.max_connections());
    assert_eq!("sqlite", config.safe_health().engine);
}

#[test]
fn sqlite_environment_url_defaults_to_single_connection() {
    let env = [(
        "SDKWORK_DRIVE_DATABASE_URL",
        "sqlite://target/dev/sdkwork-drive.sqlite",
    )];

    let config = DatabaseConfig::from_env_pairs(env).expect("sqlite env url should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!(1, config.max_connections());
}

#[test]
fn sqlite_direct_url_defaults_to_single_connection() {
    let config = DatabaseConfig::from_url("sqlite://target/dev/sdkwork-drive.sqlite")
        .expect("sqlite direct url should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!(1, config.max_connections());
}

#[test]
fn parses_postgres_database_urls_for_server_mode() {
    let config = DatabaseConfig::from_url_with_max_connections(
        "postgresql://sdkwork_drive:secret@127.0.0.1:5432/sdkwork_drive",
        12,
    )
    .expect("postgres database url should parse");

    assert_eq!(DatabaseEngine::Postgresql, config.engine());
    assert_eq!(
        "postgresql://sdkwork_drive:secret@127.0.0.1:5432/sdkwork_drive",
        config.url()
    );
    assert_eq!(12, config.max_connections());
    assert_eq!("postgresql", config.safe_health().engine);
}

#[test]
fn rejects_empty_unsupported_urls_and_invalid_pool_sizes() {
    let blank = DatabaseConfig::from_url_with_max_connections("   ", 5).unwrap_err();
    assert!(
        blank.to_string().contains("database url must not be blank"),
        "unexpected blank error: {blank}"
    );

    let mysql = DatabaseConfig::from_url_with_max_connections(
        "mysql://sdkwork_drive:secret@127.0.0.1/sdkwork_drive",
        5,
    )
    .unwrap_err();
    assert!(
        mysql.to_string().contains("PostgreSQL or SQLite"),
        "unexpected unsupported url error: {mysql}"
    );

    let pool_size = DatabaseConfig::from_url_with_max_connections(
        "sqlite://target/dev/sdkwork-drive.sqlite",
        0,
    )
    .unwrap_err();
    assert!(
        pool_size
            .to_string()
            .contains("max connections must be positive"),
        "unexpected max connection error: {pool_size}"
    );
}

#[test]
fn resolves_postgres_from_structured_environment() {
    let env = [
        ("SDKWORK_DRIVE_DATABASE_ENGINE", "postgresql"),
        ("SDKWORK_DRIVE_DATABASE_HOST", "127.0.0.1"),
        ("SDKWORK_DRIVE_DATABASE_PORT", "15432"),
        ("SDKWORK_DRIVE_DATABASE_NAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_USERNAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_PASSWORD", "drive_pass"),
        ("SDKWORK_DRIVE_DATABASE_SSL_MODE", "disable"),
        ("SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS", "10"),
    ];

    let config = DatabaseConfig::from_env_pairs(env).expect("postgres env should parse");

    assert_eq!(DatabaseEngine::Postgresql, config.engine());
    assert_eq!(10, config.max_connections());
    assert_eq!(
        "postgresql://sdkwork_drive:drive_pass@127.0.0.1:15432/sdkwork_drive?sslmode=disable",
        config.url()
    );
}

#[test]
fn resolves_sqlite_from_structured_environment_with_single_connection_default() {
    let env = [
        ("SDKWORK_DRIVE_DATABASE_ENGINE", "sqlite"),
        (
            "SDKWORK_DRIVE_DATABASE_SQLITE_URL",
            "sqlite://target/dev/sdkwork-drive.sqlite",
        ),
    ];

    let config = DatabaseConfig::from_env_pairs(env).expect("sqlite env should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/sdkwork-drive.sqlite", config.url());
    assert_eq!(1, config.max_connections());
}

#[test]
fn structured_postgres_environment_url_encodes_connection_parts() {
    let env = [
        ("SDKWORK_DRIVE_DATABASE_ENGINE", "postgresql"),
        ("SDKWORK_DRIVE_DATABASE_HOST", "db.internal"),
        ("SDKWORK_DRIVE_DATABASE_PORT", "5432"),
        ("SDKWORK_DRIVE_DATABASE_NAME", "sdkwork drive/dev"),
        ("SDKWORK_DRIVE_DATABASE_USERNAME", "sdkworkprod@2026++"),
        ("SDKWORK_DRIVE_DATABASE_PASSWORD", "pa@ss+word/with space"),
        ("SDKWORK_DRIVE_DATABASE_SSL_MODE", "require"),
    ];

    let config = DatabaseConfig::from_env_pairs(env).expect("postgres env should parse");

    assert_eq!(DatabaseEngine::Postgresql, config.engine());
    assert_eq!(
        "postgresql://sdkworkprod%402026%2B%2B:pa%40ss%2Bword%2Fwith%20space@db.internal:5432/sdkwork%20drive/dev?sslmode=require",
        config.url()
    );
}

#[test]
fn cli_database_url_overrides_structured_environment() {
    let args = vec![
        "sdkwork-routes-drive-app-api".to_string(),
        "--database-url".to_string(),
        "sqlite://target/dev/cli.sqlite".to_string(),
    ];
    let config =
        DatabaseConfig::from_env_and_cli_args(&args).expect("cli database url should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/cli.sqlite", config.url());
    assert_eq!(1, config.max_connections());
}

#[test]
fn explicit_database_url_overrides_structured_environment() {
    let env = [
        (
            "SDKWORK_DRIVE_DATABASE_URL",
            "sqlite://target/dev/override.sqlite",
        ),
        ("SDKWORK_DRIVE_DATABASE_ENGINE", "postgresql"),
        ("SDKWORK_DRIVE_DATABASE_HOST", "127.0.0.1"),
        ("SDKWORK_DRIVE_DATABASE_PORT", "15432"),
        ("SDKWORK_DRIVE_DATABASE_NAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_USERNAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_PASSWORD", "drive_pass"),
        ("SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS", "3"),
    ];

    let config = DatabaseConfig::from_env_pairs(env).expect("explicit url should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/override.sqlite", config.url());
    assert_eq!(3, config.max_connections());
}

#[test]
fn rejects_removed_database_environment_aliases() {
    let env = [
        ("SDKWORK_DRIVE_DATABASE_PROVIDER", "postgresql"),
        ("SDKWORK_DRIVE_DATABASE_SSLMODE", "disable"),
        ("SDKWORK_DRIVE_DATABASE_HOST", "127.0.0.1"),
        ("SDKWORK_DRIVE_DATABASE_NAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_USERNAME", "sdkwork_drive"),
        ("SDKWORK_DRIVE_DATABASE_PASSWORD", "drive_pass"),
    ];

    let error = DatabaseConfig::from_env_pairs(env).unwrap_err();

    assert!(
        error
            .to_string()
            .contains("SDKWORK_DRIVE_DATABASE_PROVIDER")
            && error.to_string().contains("SDKWORK_DRIVE_DATABASE_SSLMODE")
            && error.to_string().contains("SDKWORK_DRIVE_DATABASE_ENGINE")
            && error
                .to_string()
                .contains("SDKWORK_DRIVE_DATABASE_SSL_MODE"),
        "removed aliases should be rejected with standard replacements, got: {error}"
    );
}

#[test]
fn parses_sqlite_runtime_toml() {
    let config = DatabaseConfig::from_runtime_toml(
        r#"
        [database]
        engine = "sqlite"
        url = "sqlite://target/dev/sdkwork-drive.sqlite"
        "#,
    )
    .expect("sqlite runtime toml should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/sdkwork-drive.sqlite", config.url());
    assert_eq!(1, config.max_connections());
}

#[test]
fn parses_structured_postgres_runtime_toml_with_password_file() {
    let temp_dir = unique_temp_dir("postgres-password-file");
    std::fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let secret_path = temp_dir.join("database.secret");
    std::fs::write(&secret_path, "pa@ss+word/with space\n").expect("secret should be written");
    let config_path = temp_dir.join("drive.database.toml");
    std::fs::write(
        &config_path,
        r#"
        [database]
        engine = "postgresql"
        host = "db.internal"
        port = 5432
        database = "sdkwork drive/dev"
        username = "sdkworkprod@2026++"
        password_file = "./database.secret"
        ssl_mode = "require"
        max_connections = 16
        "#,
    )
    .expect("toml config should be written");

    let config =
        DatabaseConfig::from_runtime_toml_file(&config_path).expect("postgres toml should parse");

    assert_eq!(DatabaseEngine::Postgresql, config.engine());
    assert_eq!(16, config.max_connections());
    assert_eq!(
        "postgresql://sdkworkprod%402026%2B%2B:pa%40ss%2Bword%2Fwith%20space@db.internal:5432/sdkwork%20drive/dev?sslmode=require",
        config.url()
    );
}

#[test]
fn env_url_override_wins_over_config_file() {
    let temp_dir = unique_temp_dir("env-override");
    std::fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let config_path = temp_dir.join("drive.database.toml");
    std::fs::write(
        &config_path,
        r#"
        [database]
        engine = "postgresql"
        host = "db.internal"
        database = "sdkwork_drive"
        username = "sdkwork_drive"
        password = "drive_pass"
        "#,
    )
    .expect("toml config should be written");

    let config_path_string = config_path.to_string_lossy().to_string();
    let env = [
        ("SDKWORK_DRIVE_CONFIG_FILE", config_path_string.as_str()),
        (
            "SDKWORK_DRIVE_DATABASE_URL",
            "sqlite://target/dev/override.sqlite",
        ),
    ];
    let config = DatabaseConfig::from_env_pairs(env).expect("env override should parse");

    assert_eq!(DatabaseEngine::Sqlite, config.engine());
    assert_eq!("sqlite://target/dev/override.sqlite", config.url());
    assert_eq!(1, config.max_connections());
}

#[test]
fn safe_health_never_exposes_connection_string_material() {
    let config = DatabaseConfig::from_url_with_max_connections(
        "postgresql://sdkwork_drive:secret@db.internal:5432/sdkwork_drive?sslmode=require",
        7,
    )
    .expect("postgres database url should parse");

    let health = serde_json::to_string(&config.safe_health()).expect("health should serialize");
    assert!(health.contains("\"configured\":true"));
    assert!(health.contains("\"engine\":\"postgresql\""));
    assert!(health.contains("\"maxConnections\":7"));
    assert!(!health.contains("secret"));
    assert!(!health.contains("db.internal"));
    assert!(!health.contains("sdkwork_drive"));
    assert!(!health.contains("sslmode"));
}

fn unique_temp_dir(label: &str) -> std::path::PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after unix epoch")
        .as_nanos();
    std::env::temp_dir().join(format!("sdkwork-drive-config-{label}-{nanos}"))
}
