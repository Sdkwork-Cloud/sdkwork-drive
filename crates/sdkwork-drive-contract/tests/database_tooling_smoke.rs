use std::path::PathBuf;

mod common;
use common::run_node_command_in;

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

    let dev_script = scripts
        .get("dev")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev script should exist");
    let dev_sqlite_script = scripts
        .get("dev:browser:sqlite")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev:browser:sqlite script should exist");
    let dev_desktop_script = scripts
        .get("dev:desktop")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm dev:desktop script should exist");

    let dispatcher_path = root.join("scripts/sdkwork-command.mjs");
    let dispatcher = std::fs::read_to_string(&dispatcher_path)
        .expect("scripts/sdkwork-command.mjs should exist");

    assert!(
        dev_script.contains("dev:browser"),
        "pnpm dev must delegate to dev:browser, got: {dev_script}"
    );
    assert!(
        dispatcher.contains("drive-dev.mjs")
            && dispatcher.contains("'--database', 'postgres'")
            && dispatcher.contains("'--deployment-profile', 'standalone'"),
        "sdkwork-command.mjs must dispatch default dev to drive-dev.mjs with PostgreSQL and standalone profile"
    );

    assert!(
        dev_sqlite_script.contains("sdkwork-command.mjs"),
        "pnpm dev:browser:sqlite must delegate through sdkwork-command.mjs, got: {dev_sqlite_script}"
    );
    assert!(
        dispatcher.contains("'--database', 'sqlite'") && dispatcher.contains("'--deployment-profile', 'standalone'"),
        "sdkwork-command.mjs must dispatch dev:browser:sqlite with SQLite and standalone profile"
    );

    assert!(
        dev_desktop_script.contains("dev:desktop:postgres:unified-process:standalone"),
        "pnpm dev:desktop must delegate to the standalone desktop variant, got: {dev_desktop_script}"
    );

    let package_script = scripts
        .get("gateway:package:standalone")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm gateway:package:standalone script should exist");
    assert!(
        package_script.contains("sdkwork-command.mjs"),
        "pnpm gateway:package:standalone must delegate through sdkwork-command.mjs, got: {package_script}"
    );
    assert!(
        dispatcher.contains("gateway-standalone-pack.mjs"),
        "sdkwork-command.mjs must dispatch gateway:package:standalone to gateway-standalone-pack.mjs"
    );

    let cloud_bundle_script = scripts
        .get("gateway:package:cloud")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm gateway:package:cloud script should exist");
    assert!(
        cloud_bundle_script.contains("sdkwork-command.mjs"),
        "pnpm gateway:package:cloud must delegate through sdkwork-command.mjs, got: {cloud_bundle_script}"
    );
    assert!(
        dispatcher.contains("gateway-cloud-bundle.mjs"),
        "sdkwork-command.mjs must dispatch gateway:package:cloud to gateway-cloud-bundle.mjs"
    );

    let drive_build = scripts
        .get("build")
        .and_then(serde_json::Value::as_str)
        .expect("pnpm build script should exist");
    assert!(
        drive_build.contains("sdkwork-command.mjs"),
        "pnpm build must delegate through sdkwork-command.mjs, got: {drive_build}"
    );
    assert!(
        dispatcher.contains("drive-build.mjs") && dispatcher.contains("'--deployment-profile', 'cloud'"),
        "sdkwork-command.mjs must dispatch build to drive-build.mjs with cloud deployment profile"
    );
}

#[test]
fn postgres_and_toml_examples_use_standard_drive_config_keys() {
    let root = workspace_root();
    let postgres_example = std::fs::read_to_string(root.join(".env.postgres.example"))
        .expect(".env.postgres.example should exist");

    for required in [
        "SDKWORK_DRIVE_DATABASE_ENGINE=postgresql",
        "SDKWORK_DRIVE_DATABASE_HOST=127.0.0.1",
        "SDKWORK_DRIVE_DATABASE_PORT=5432",
        "SDKWORK_DRIVE_DATABASE_NAME=sdkwork_ai_dev",
        "SDKWORK_DRIVE_DATABASE_SCHEMA=sdkwork_ai_dev",
        "SDKWORK_DRIVE_DATABASE_USERNAME=sdkwork_ai_dev",
        "SDKWORK_DRIVE_DATABASE_PASSWORD=sdkworkdev123",
        "SDKWORK_DRIVE_DATABASE_SSL_MODE=disable",
        "SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS=32",
        "SDKWORK_DRIVE_DATABASE_ADMIN_HOST=127.0.0.1",
        "SDKWORK_DRIVE_DATABASE_ADMIN_SSL_MODE=disable",
    ] {
        assert!(
            postgres_example.contains(required),
            ".env.postgres.example must include standard key {required}"
        );
    }
    for forbidden in [
        "SDKWORK_DRIVE_DATABASE_PROVIDER",
        "SDKWORK_DRIVE_DATABASE_SSLMODE",
    ] {
        assert!(
            !postgres_example.contains(forbidden),
            ".env.postgres.example must not include legacy key {forbidden}"
        );
    }

    let toml_example = std::fs::read_to_string(root.join("configs/drive.database.example.toml"))
        .expect("configs/drive.database.example.toml should exist");
    for required in [
        "SDKWORK_DRIVE_CONFIG_FILE=./configs/drive.database.example.toml",
        "[database]",
        "engine = \"postgresql\"",
        "ssl_mode = \"require\"",
        "[database_sqlite_example]",
    ] {
        assert!(
            toml_example.contains(required),
            "drive database TOML example must include {required}"
        );
    }
}

#[test]
fn drive_launch_plan_reports_database_engine_without_leaking_secrets() {
    let root = workspace_root();
    let output = run_node_command_in(
        &root,
        [
            root.join("scripts/run-drive-api-server.mjs"),
            PathBuf::from("plan"),
            PathBuf::from("--dev-env-file"),
            root.join(".env.postgres.example"),
        ],
    )
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
        "drive app-api router: cargo",
        "drive backend-api router: cargo",
        "drive open-api router: cargo",
        "drive storage backend router: cargo",
        "sdkwork-router-storage-backend-api",
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
            "SDKWORK_DRIVE_DATABASE_ENGINE=postgresql",
            "SDKWORK_DRIVE_DATABASE_HOST=db.internal",
            "SDKWORK_DRIVE_DATABASE_PORT=5432",
            "SDKWORK_DRIVE_DATABASE_NAME=sdkwork drive/dev",
            "SDKWORK_DRIVE_DATABASE_SCHEMA=sdkwork_ai_dev",
            "SDKWORK_DRIVE_DATABASE_USERNAME=sdkworkprod@2026++",
            "SDKWORK_DRIVE_DATABASE_PASSWORD=pa@ss+word/with space",
            "SDKWORK_DRIVE_DATABASE_SSL_MODE=require",
            "SDKWORK_DRIVE_DATABASE_MAX_CONNECTIONS=32",
        ]
        .join("\n"),
    )
    .expect("env file should be written");

    let output = run_node_command_in(
        &root,
        [
            root.join("scripts/run-drive-api-server.mjs"),
            PathBuf::from("plan"),
            PathBuf::from("--dev-env-file"),
            env_file.clone(),
        ],
    )
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
fn drive_launch_plan_rejects_legacy_database_aliases() {
    let root = workspace_root();
    let temp_dir = root.join("target").join("database-tooling-smoke");
    std::fs::create_dir_all(&temp_dir).expect("temp dir should be created");
    let env_file = temp_dir.join("postgres-legacy.env");
    std::fs::write(
        &env_file,
        [
            "SDKWORK_DRIVE_DATABASE_PROVIDER=postgresql",
            "SDKWORK_DRIVE_DATABASE_HOST=127.0.0.1",
            "SDKWORK_DRIVE_DATABASE_PORT=5432",
            "SDKWORK_DRIVE_DATABASE_NAME=sdkwork_ai_dev",
            "SDKWORK_DRIVE_DATABASE_USERNAME=sdkwork_ai_dev",
            "SDKWORK_DRIVE_DATABASE_PASSWORD=sdkworkdev123",
            "SDKWORK_DRIVE_DATABASE_SSLMODE=disable",
        ]
        .join("\n"),
    )
    .expect("env file should be written");

    let output = run_node_command_in(
        &root,
        [
            root.join("scripts/run-drive-api-server.mjs"),
            PathBuf::from("plan"),
            PathBuf::from("--dev-env-file"),
            env_file.clone(),
        ],
    )
    .expect("drive product runner should start");

    assert!(
        !output.status.success(),
        "legacy aliases should fail closed, stdout:\n{}\nstderr:\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("SDKWORK_DRIVE_DATABASE_PROVIDER")
            && stderr.contains("SDKWORK_DRIVE_DATABASE_SSLMODE"),
        "error should name rejected legacy aliases, stderr:\n{stderr}"
    );
}

#[test]
fn drive_launch_plan_accepts_explicit_sqlite_database_url() {
    let root = workspace_root();
    let output = run_node_command_in(
        &root,
        [
            root.join("scripts/run-drive-api-server.mjs"),
            PathBuf::from("plan"),
            PathBuf::from("--"),
            PathBuf::from("--database-url"),
            PathBuf::from("sqlite://target/dev/sdkwork-drive.sqlite"),
        ],
    )
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
        "SDKWORK_DRIVE_CONFIG_FILE=./configs/drive.database.example.toml",
        "SDKWORK_DRIVE_DATABASE_ENGINE=postgresql",
        "SDKWORK_DRIVE_DATABASE_SSL_MODE",
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
