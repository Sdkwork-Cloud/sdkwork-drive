use sqlx::AnyPool;

/// Create a test database with in-memory SQLite.
///
/// This function creates an in-memory SQLite database and applies
/// the Drive schema migrations for testing purposes.
pub async fn create_test_database() -> Result<AnyPool, sqlx::Error> {
    let pool = AnyPool::connect("sqlite::memory:").await?;

    // Apply schema migrations
    sqlx::query(CREATE_SPACE_TABLE_SQL).execute(&pool).await?;
    sqlx::query(CREATE_NODE_TABLE_SQL).execute(&pool).await?;
    sqlx::query(CREATE_STORAGE_PROVIDER_TABLE_SQL)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_UPLOAD_SESSION_TABLE_SQL)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_UPLOAD_PART_TABLE_SQL)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_DOWNLOAD_GRANT_TABLE_SQL)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_QUOTA_USAGE_TABLE_SQL)
        .execute(&pool)
        .await?;
    sqlx::query(CREATE_AUDIT_EVENT_TABLE_SQL)
        .execute(&pool)
        .await?;

    Ok(pool)
}

// Schema SQL constants
const CREATE_SPACE_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_space (
    id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    owner_type VARCHAR(64) NOT NULL,
    owner_id VARCHAR(128) NOT NULL,
    space_type VARCHAR(64) NOT NULL,
    name VARCHAR(512) NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL
);
";

const CREATE_NODE_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_node (
    id VARCHAR(128) PRIMARY KEY,
    space_id VARCHAR(128) NOT NULL,
    parent_id VARCHAR(128),
    node_type VARCHAR(64) NOT NULL,
    name VARCHAR(512) NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    content_state VARCHAR(64) NOT NULL DEFAULT 'active',
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL
);
";

const CREATE_STORAGE_PROVIDER_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_storage_provider (
    id VARCHAR(128) PRIMARY KEY,
    provider_kind VARCHAR(64) NOT NULL,
    name VARCHAR(256) NOT NULL,
    endpoint_url VARCHAR(1024) NOT NULL,
    region VARCHAR(128),
    bucket VARCHAR(256) NOT NULL,
    path_style BOOLEAN NOT NULL DEFAULT FALSE,
    credential_ref VARCHAR(512),
    status VARCHAR(64) NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL
);
";

const CREATE_UPLOAD_SESSION_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_upload_session (
    id VARCHAR(128) PRIMARY KEY,
    space_id VARCHAR(128) NOT NULL,
    node_id VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(256),
    state VARCHAR(64) NOT NULL DEFAULT 'created',
    expires_at_ms BIGINT NOT NULL,
    created_at_ms BIGINT NOT NULL,
    updated_at_ms BIGINT NOT NULL
);
";

const CREATE_UPLOAD_PART_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_upload_part (
    id VARCHAR(128) PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    part_number INTEGER NOT NULL,
    etag VARCHAR(256),
    size_bytes BIGINT NOT NULL,
    uploaded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at_ms BIGINT NOT NULL
);
";

const CREATE_DOWNLOAD_GRANT_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_download_grant (
    id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    node_id VARCHAR(128) NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at_ms BIGINT NOT NULL
);
";

const CREATE_QUOTA_USAGE_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_quota_usage (
    id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    space_id VARCHAR(128),
    used_bytes BIGINT NOT NULL DEFAULT 0,
    file_count BIGINT NOT NULL DEFAULT 0,
    updated_at_ms BIGINT NOT NULL
);
";

const CREATE_AUDIT_EVENT_TABLE_SQL: &str = "
CREATE TABLE IF NOT EXISTS drive_audit_event (
    id VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    operator_id VARCHAR(128) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(128) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    details TEXT,
    created_at_ms BIGINT NOT NULL
);
";
