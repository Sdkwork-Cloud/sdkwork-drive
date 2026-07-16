-- Server sandbox volumes, explicit grants, and idempotent filesystem mutations.
CREATE TABLE IF NOT EXISTS dr_drive_sandbox_volume (
    id VARCHAR(128) NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64),
    display_name VARCHAR(255) NOT NULL,
    root_entry_id VARCHAR(128) NOT NULL,
    provider_kind VARCHAR(32) NOT NULL,
    provider_root_ref TEXT NOT NULL,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active',
    default_access VARCHAR(32) NOT NULL DEFAULT 'full',
    version BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_dr_drive_sandbox_volume_runtime_provider
        CHECK (provider_kind = 'local_filesystem'),
    CONSTRAINT ck_dr_drive_sandbox_volume_status
        CHECK (lifecycle_status IN ('active', 'read_only', 'disabled')),
    CONSTRAINT ck_dr_drive_sandbox_volume_default_access
        CHECK (default_access IN ('full', 'read_only'))
);

DO $$
DECLARE
    unavailable_provider_count BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE connamespace = current_schema()::regnamespace
          AND conrelid = 'dr_drive_sandbox_volume'::regclass
          AND conname = 'ck_dr_drive_sandbox_volume_runtime_provider'
    ) THEN
        SELECT COUNT(1)
        INTO unavailable_provider_count
        FROM dr_drive_sandbox_volume
        WHERE provider_kind != 'local_filesystem';

        IF unavailable_provider_count > 0 THEN
            RAISE EXCEPTION
                'sandbox provider migration blocked: % volume(s) use providers without runtime adapters',
                unavailable_provider_count;
        END IF;

        ALTER TABLE dr_drive_sandbox_volume
            ADD CONSTRAINT ck_dr_drive_sandbox_volume_runtime_provider
            CHECK (provider_kind = 'local_filesystem');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_volume_tenant_status
    ON dr_drive_sandbox_volume (tenant_id, lifecycle_status, display_name);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_volume_tenant_organization_status
    ON dr_drive_sandbox_volume (
        tenant_id,
        organization_id,
        lifecycle_status,
        display_name,
        id
    );
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_sandbox_volume_root_entry
    ON dr_drive_sandbox_volume (id, root_entry_id);

CREATE TABLE IF NOT EXISTS dr_drive_sandbox_grant (
    id VARCHAR(128) NOT NULL PRIMARY KEY,
    sandbox_id VARCHAR(128) NOT NULL
        REFERENCES dr_drive_sandbox_volume(id) ON DELETE CASCADE,
    subject_type VARCHAR(32) NOT NULL,
    subject_id VARCHAR(128) NOT NULL,
    access_level VARCHAR(32) NOT NULL DEFAULT 'full',
    granted_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_dr_drive_sandbox_grant_subject
        UNIQUE (sandbox_id, subject_type, subject_id),
    CONSTRAINT ck_dr_drive_sandbox_grant_subject_type
        CHECK (subject_type IN ('user', 'organization', 'workspace', 'role')),
    CONSTRAINT ck_dr_drive_sandbox_grant_access
        CHECK (access_level IN ('full', 'read_only'))
);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_grant_subject
    ON dr_drive_sandbox_grant (subject_type, subject_id, sandbox_id);

CREATE TABLE IF NOT EXISTS dr_drive_sandbox_mutation_operation (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    sandbox_id VARCHAR(128) NOT NULL
        REFERENCES dr_drive_sandbox_volume(id) ON DELETE CASCADE,
    actor_id VARCHAR(128) NOT NULL,
    idempotency_key_hash VARCHAR(64) NOT NULL,
    request_fingerprint VARCHAR(64) NOT NULL,
    mutation_kind VARCHAR(32) NOT NULL,
    parent_logical_path TEXT NOT NULL,
    entry_name VARCHAR(255) NOT NULL,
    operation_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    lease_token VARCHAR(64) NOT NULL,
    lease_expires_at_ms BIGINT NOT NULL,
    result_entry_id VARCHAR(128),
    result_parent_id VARCHAR(128),
    result_entry_kind VARCHAR(32),
    result_logical_path TEXT,
    result_revision VARCHAR(128),
    result_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_dr_drive_sandbox_mutation_operation_key
        UNIQUE (tenant_id, sandbox_id, actor_id, idempotency_key_hash),
    CONSTRAINT ck_dr_drive_sandbox_mutation_operation_status
        CHECK (operation_status IN ('pending', 'completed', 'failed_conflict')),
    CONSTRAINT ck_dr_drive_sandbox_mutation_operation_result_kind
        CHECK (result_entry_kind IS NULL OR result_entry_kind IN ('directory', 'file')),
    CONSTRAINT ck_dr_drive_sandbox_mutation_operation_kind
        CHECK (mutation_kind IN (
            'create_directory',
            'create_file',
            'update_file',
            'move_entry',
            'delete_entry'
        ))
);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_mutation_operation_pending
    ON dr_drive_sandbox_mutation_operation (operation_status, lease_expires_at_ms);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_mutation_operation_sandbox_created
    ON dr_drive_sandbox_mutation_operation (tenant_id, sandbox_id, created_at DESC);
