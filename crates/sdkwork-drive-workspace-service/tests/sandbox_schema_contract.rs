use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::sql::{
    install_any_schema, install_postgres_schema,
};
use sqlx::any::AnyPoolOptions;
use sqlx::{AnyPool, PgPool};

const SQLITE_SANDBOX_MIGRATION_UP: &str =
    include_str!("../../../database/migrations/sqlite/0007_drive_sandbox_workspace.up.sql");
const SQLITE_SANDBOX_MIGRATION_DOWN: &str =
    include_str!("../../../database/migrations/sqlite/0007_drive_sandbox_workspace.down.sql");

#[tokio::test]
async fn sqlite_sandbox_schema_enforces_grant_integrity_and_supporting_indexes() {
    let pool = sqlite_pool().await;
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .expect("sqlite foreign-key enforcement should be enabled for the contract test");

    insert_volume(&pool, "sandbox-schema", "tenant-schema", "local_filesystem")
        .await
        .expect("valid sandbox volume should be accepted");
    insert_grant(
        &pool,
        "grant-schema",
        "sandbox-schema",
        "user",
        "user-schema",
        "full",
    )
    .await
    .expect("valid sandbox grant should be accepted");
    sqlx::query(
        "INSERT INTO dr_drive_sandbox_mutation_operation (
            id, tenant_id, sandbox_id, actor_id, idempotency_key_hash, request_fingerprint,
            mutation_kind, parent_logical_path, entry_name, lease_token, lease_expires_at_ms
         ) VALUES (7001, 'tenant-schema', 'sandbox-schema', 'user-schema', 'hashed-key-schema',
                   'fingerprint', 'create_directory', '', 'project', 'lease-token', 1)",
    )
    .execute(&pool)
    .await
    .expect("valid sandbox directory operation should be accepted");

    assert!(
        insert_volume(
            &pool,
            "sandbox-invalid-provider",
            "tenant-schema",
            "invalid"
        )
        .await
        .is_err(),
        "sandbox schema must reject unknown provider kinds"
    );
    for unavailable_provider in ["s3", "opendal"] {
        assert!(
            insert_volume(
                &pool,
                &format!("sandbox-unavailable-{unavailable_provider}"),
                "tenant-schema",
                unavailable_provider,
            )
            .await
            .is_err(),
            "sandbox schema must reject provider without a runtime adapter: {unavailable_provider}"
        );
    }
    assert!(
        insert_grant(
            &pool,
            "grant-invalid-subject-type",
            "sandbox-schema",
            "service",
            "service-schema",
            "full",
        )
        .await
        .is_err(),
        "sandbox schema must reject unsupported grant subject types"
    );
    assert!(
        insert_grant(
            &pool,
            "grant-invalid-access",
            "sandbox-schema",
            "user",
            "user-invalid-access",
            "admin",
        )
        .await
        .is_err(),
        "sandbox schema must reject unsupported grant access levels"
    );
    assert!(
        insert_grant(
            &pool,
            "grant-duplicate-subject",
            "sandbox-schema",
            "user",
            "user-schema",
            "full",
        )
        .await
        .is_err(),
        "sandbox schema must allow at most one grant per sandbox subject"
    );

    for index_name in [
        "ix_dr_drive_sandbox_volume_tenant_status",
        "ix_dr_drive_sandbox_volume_tenant_organization_status",
        "ix_dr_drive_sandbox_grant_subject",
        "ix_dr_drive_sandbox_mutation_operation_pending",
        "ix_dr_drive_sandbox_mutation_operation_sandbox_created",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='index' AND name=?1")
                .bind(index_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite sandbox index lookup should succeed");
        assert_eq!(count, 1, "expected sandbox index exists: {index_name}");
    }
    let operation_columns: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM pragma_table_info('dr_drive_sandbox_mutation_operation')",
    )
    .fetch_all(&pool)
    .await
    .expect("sandbox operation columns should be readable");
    for forbidden in [
        "provider_root_ref",
        "physical_path",
        "absolute_path",
        "browser_handle",
        "tauri_path",
        "idempotency_key",
    ] {
        assert!(
            !operation_columns.iter().any(|column| column == forbidden),
            "sandbox operation must not persist {forbidden}"
        );
    }

    sqlx::query("DELETE FROM dr_drive_sandbox_volume WHERE id=?1")
        .bind("sandbox-schema")
        .execute(&pool)
        .await
        .expect("sandbox volume deletion should succeed");
    let grant_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM dr_drive_sandbox_grant WHERE sandbox_id=?1")
            .bind("sandbox-schema")
            .fetch_one(&pool)
            .await
            .expect("sandbox grant count should be readable");
    assert_eq!(
        grant_count, 0,
        "sandbox grants must cascade on volume deletion"
    );
    let operation_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM dr_drive_sandbox_mutation_operation WHERE sandbox_id=?1",
    )
    .bind("sandbox-schema")
    .fetch_one(&pool)
    .await
    .expect("sandbox operation count should be readable");
    assert_eq!(
        operation_count, 0,
        "sandbox mutation operations must cascade on volume deletion"
    );
}

#[tokio::test]
async fn postgres_sandbox_schema_exposes_required_tables_and_indexes_when_configured() {
    let database_url = match std::env::var("SDKWORK_DRIVE_POSTGRES_URL") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skip postgres sandbox schema contract: SDKWORK_DRIVE_POSTGRES_URL is not set"
            );
            return;
        }
    };

    let pool = PgPool::connect(&database_url)
        .await
        .expect("postgres pool should be created");
    install_postgres_schema(&pool)
        .await
        .expect("postgres sandbox schema should be installed");

    for table_name in [
        "dr_drive_sandbox_volume",
        "dr_drive_sandbox_grant",
        "dr_drive_sandbox_mutation_operation",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name=$1
            )",
        )
        .bind(table_name)
        .fetch_one(&pool)
        .await
        .expect("postgres sandbox table lookup should succeed");
        assert!(exists, "expected sandbox table exists: {table_name}");
    }

    for index_name in [
        "ix_dr_drive_sandbox_volume_tenant_status",
        "ix_dr_drive_sandbox_volume_tenant_organization_status",
        "ix_dr_drive_sandbox_grant_subject",
        "ix_dr_drive_sandbox_mutation_operation_pending",
        "ix_dr_drive_sandbox_mutation_operation_sandbox_created",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname='public' AND indexname=$1
            )",
        )
        .bind(index_name)
        .fetch_one(&pool)
        .await
        .expect("postgres sandbox index lookup should succeed");
        assert!(exists, "expected sandbox index exists: {index_name}");
    }
}

#[tokio::test]
async fn sqlite_upgrade_fails_closed_on_provider_rows_without_runtime_adapters() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    sqlx::query(
        "CREATE TABLE dr_drive_sandbox_volume (
            id TEXT NOT NULL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            display_name TEXT NOT NULL,
            root_entry_id TEXT NOT NULL,
            provider_kind TEXT NOT NULL,
            provider_root_ref TEXT NOT NULL,
            lifecycle_status TEXT NOT NULL DEFAULT 'active',
            default_access TEXT NOT NULL DEFAULT 'full',
            version INTEGER NOT NULL DEFAULT 1,
            created_by TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK (provider_kind IN ('local_filesystem', 's3', 'opendal'))
         )",
    )
    .execute(&pool)
    .await
    .expect("legacy sandbox volume table should be created");
    let private_root = "private-provider-root-must-not-leak";
    sqlx::query(
        "INSERT INTO dr_drive_sandbox_volume (
            id, tenant_id, organization_id, display_name, root_entry_id,
            provider_kind, provider_root_ref, created_by, updated_by
         ) VALUES ('legacy-s3', 'tenant-schema', 'organization-schema', 'Legacy S3',
                   'legacy-root', 's3', ?1, 'schema-test', 'schema-test')",
    )
    .bind(private_root)
    .execute(&pool)
    .await
    .expect("legacy provider fixture should be inserted");

    let error = install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect_err("schema upgrade must reject providers without runtime adapters");
    let message = error.to_string();
    assert!(message.contains("providers without runtime adapters"));
    assert!(!message.contains(private_root));
}

#[tokio::test]
async fn sqlite_governed_sandbox_migration_applies_and_rolls_back_cleanly() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    sqlx::raw_sql(SQLITE_SANDBOX_MIGRATION_UP)
        .execute(&pool)
        .await
        .expect("sandbox migration should apply");

    for table_name in [
        "dr_drive_sandbox_volume",
        "dr_drive_sandbox_grant",
        "dr_drive_sandbox_mutation_operation",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(table_name)
                .fetch_one(&pool)
                .await
                .expect("sandbox migration table lookup should succeed");
        assert_eq!(count, 1, "migration should create {table_name}");
    }
    assert!(
        insert_volume(&pool, "migration-s3", "tenant-migration", "s3")
            .await
            .is_err(),
        "governed migration must reject providers without runtime adapters"
    );

    sqlx::raw_sql(SQLITE_SANDBOX_MIGRATION_DOWN)
        .execute(&pool)
        .await
        .expect("sandbox migration should roll back");
    let remaining: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM sqlite_master
         WHERE type='table' AND name LIKE 'dr_drive_sandbox_%'",
    )
    .fetch_one(&pool)
    .await
    .expect("rolled-back sandbox table count should be readable");
    assert_eq!(remaining, 0);
}

async fn sqlite_pool() -> AnyPool {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");
    pool
}

async fn insert_volume(
    pool: &AnyPool,
    sandbox_id: &str,
    tenant_id: &str,
    provider_kind: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_sandbox_volume (
            id, tenant_id, display_name, root_entry_id, provider_kind, provider_root_ref,
            lifecycle_status, default_access, version, created_by, updated_by
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', 'full', 1, 'schema-test', 'schema-test')",
    )
    .bind(sandbox_id)
    .bind(tenant_id)
    .bind(format!("Sandbox {sandbox_id}"))
    .bind(format!("root-entry:{sandbox_id}"))
    .bind(provider_kind)
    .bind(format!("opaque-provider-root:{sandbox_id}"))
    .execute(pool)
    .await
    .map(|_| ())
}

async fn insert_grant(
    pool: &AnyPool,
    grant_id: &str,
    sandbox_id: &str,
    subject_type: &str,
    subject_id: &str,
    access_level: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_sandbox_grant (
            id, sandbox_id, subject_type, subject_id, access_level, granted_by
         ) VALUES (?1, ?2, ?3, ?4, ?5, 'schema-test')",
    )
    .bind(grant_id)
    .bind(sandbox_id)
    .bind(subject_type)
    .bind(subject_id)
    .bind(access_level)
    .execute(pool)
    .await
    .map(|_| ())
}
