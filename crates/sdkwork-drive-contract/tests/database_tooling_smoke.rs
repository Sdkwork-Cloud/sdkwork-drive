use std::path::PathBuf;
use std::process::Command;

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

#[test]
fn package_scripts_select_postgres_by_default_and_sqlite_explicitly() {
    let root = workspace_root();
    let package_json_path = root.join("package.json");
    let package_json =
        std::fs::read_to_string(&package_json_path).expect("root package.json should exist");
    let manifest: serde_json::Value =
        serde_json::from_str(&package_json).expect("package.json should be valid json");
    let scripts = manifest
        .get("scripts")
        .and_then(serde_json::Value::as_object)
        .expect("package.json scripts should exist");

    let dev = scripts
        .get("dev")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev script should exist");
    let dev_sqlite = scripts
        .get("dev:sqlite")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev:sqlite script should exist");
    let dev_postgres = scripts
        .get("dev:postgres")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev:postgres script should exist");

    assert!(
        dev.contains("run-drive-product.mjs") && dev.contains("--dev-env-file .env.postgres"),
        "pnpm dev must use PostgreSQL profile, got: {dev}"
    );
    assert!(
        dev_sqlite.contains("run-drive-product.mjs")
            && dev_sqlite.contains("--database-url sqlite://target/dev/sdkwork-drive.sqlite"),
        "pnpm dev:sqlite must use SQLite database url, got: {dev_sqlite}"
    );
    assert!(
        dev_postgres.contains("--dev-env-file .env.postgres"),
        "pnpm dev:postgres must use PostgreSQL env file, got: {dev_postgres}"
    );
}

#[test]
fn drive_launch_plan_reports_database_engine_without_leaking_secrets() {
    let root = workspace_root();
    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("scripts/run-drive-product.mjs"))
        .arg("plan")
        .arg("--dev-env-file")
        .arg(root.join(".env.postgres.example"))
        .output()
        .expect("drive product runner should start");

    assert!(
        output.status.success(),
        "stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("databaseEngine=postgresql"),
        "plan should report PostgreSQL engine, stdout:\n{stdout}"
    );
    assert!(
        !stdout.contains("drive_pass") && !stdout.contains("sdkwork_drive:"),
        "plan output must not leak credentials, stdout:\n{stdout}"
    );

    for required_service in [
        "drive app api: cargo",
        "drive backend api: cargo",
        "drive open api: cargo",
        "drive admin storage api: cargo",
        "sdkwork-drive-admin-storage-api",
    ] {
        assert!(
            stdout.contains(required_service),
            "launch plan must include {required_service}, stdout:\n{stdout}"
        );
    }
}

#[test]
fn drive_launch_plan_url_encodes_structured_postgres_fields() {
    let root = workspace_root();
    let temp_dir = root.join("target").join("database-tooling-smoke");
    std::fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let env_file = temp_dir.join("postgres-special.env");
    std::fs::write(
        &env_file,
        [
            "SDKWORK_DRIVE_DATABASE_PROVIDER=postgresql",
            "SDKWORK_DRIVE_DATABASE_HOST=db.internal",
            "SDKWORK_DRIVE_DATABASE_PORT=5432",
            "SDKWORK_DRIVE_DATABASE_NAME=sdkwork drive/dev",
            "SDKWORK_DRIVE_DATABASE_USERNAME=sdkworkprod@2026++",
            "SDKWORK_DRIVE_DATABASE_PASSWORD=pa@ss+word/with space",
            "SDKWORK_DRIVE_DATABASE_SSLMODE=require",
            "SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS=10",
        ]
        .join("\n"),
    )
    .expect("env file should be written");

    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("scripts/run-drive-product.mjs"))
        .arg("plan")
        .arg("--dev-env-file")
        .arg(&env_file)
        .output()
        .expect("drive product runner should start");

    assert!(
        output.status.success(),
        "stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("databaseEngine=postgresql"),
        "plan should report PostgreSQL engine, stdout:\n{stdout}"
    );
    assert!(
        !stdout.contains("pa@ss+word")
            && !stdout.contains("sdkworkprod@2026++")
            && !stdout.contains("db.internal"),
        "plan output must not leak structured database fields, stdout:\n{stdout}"
    );
}

#[test]
fn drive_launch_plan_accepts_explicit_sqlite_database_url() {
    let root = workspace_root();
    let output = Command::new("node")
        .current_dir(&root)
        .arg(root.join("scripts/run-drive-product.mjs"))
        .arg("plan")
        .arg("--")
        .arg("--database-url")
        .arg("sqlite://target/dev/sdkwork-drive.sqlite")
        .output()
        .expect("drive product runner should start");

    assert!(
        output.status.success(),
        "stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("databaseEngine=sqlite"),
        "plan should report SQLite engine, stdout:\n{stdout}"
    );
    assert!(
        stdout
            .lines()
            .any(|line| line.contains("[sdkwork-drive] databaseEngine=sqlite maxConnections=1")),
        "SQLite local mode should default to a single connection, stdout:\n{stdout}"
    );
}

#[test]
fn database_architecture_doc_records_runtime_boundary() {
    let root = workspace_root();
    let doc = std::fs::read_to_string(root.join("docs/database-architecture.md"))
        .expect("database architecture doc should exist");

    for required in [
        "PostgreSQL is the server, Docker, Kubernetes, and production target",
        "SQLite is the local/private lightweight mode",
        "pnpm dev",
        "pnpm dev:sqlite",
        "build_router_with_database_config",
        "sqlx::AnyPool",
        "Runtime SQL must use PostgreSQL-compatible `$1`, `$2`, ... bind placeholders",
        "Supported runtime database engines are PostgreSQL and SQLite only",
    ] {
        assert!(
            doc.contains(required),
            "database architecture doc should include {required}"
        );
    }
}
