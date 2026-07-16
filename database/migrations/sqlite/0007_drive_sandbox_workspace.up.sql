-- Server sandbox volumes, explicit grants, and idempotent filesystem mutations.
CREATE TABLE IF NOT EXISTS dr_drive_sandbox_volume (
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
    CHECK (provider_kind = 'local_filesystem'),
    CHECK (lifecycle_status IN ('active', 'read_only', 'disabled')),
    CHECK (default_access IN ('full', 'read_only'))
);
CREATE TRIGGER IF NOT EXISTS trg_dr_drive_sandbox_volume_local_provider_insert
BEFORE INSERT ON dr_drive_sandbox_volume
WHEN NEW.provider_kind != 'local_filesystem'
BEGIN
    SELECT RAISE(ABORT, 'sandbox provider is not runtime-backed');
END;
CREATE TRIGGER IF NOT EXISTS trg_dr_drive_sandbox_volume_local_provider_update
BEFORE UPDATE OF provider_kind ON dr_drive_sandbox_volume
WHEN NEW.provider_kind != 'local_filesystem'
BEGIN
    SELECT RAISE(ABORT, 'sandbox provider is not runtime-backed');
END;
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
    id TEXT NOT NULL PRIMARY KEY,
    sandbox_id TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'full',
    granted_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sandbox_id, subject_type, subject_id),
    FOREIGN KEY (sandbox_id) REFERENCES dr_drive_sandbox_volume(id) ON DELETE CASCADE,
    CHECK (subject_type IN ('user', 'organization', 'workspace', 'role')),
    CHECK (access_level IN ('full', 'read_only'))
);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_grant_subject
    ON dr_drive_sandbox_grant (subject_type, subject_id, sandbox_id);

CREATE TABLE IF NOT EXISTS dr_drive_sandbox_mutation_operation (
    id INTEGER NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    idempotency_key_hash TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL,
    mutation_kind TEXT NOT NULL
        CHECK (mutation_kind IN (
            'create_directory',
            'create_file',
            'update_file',
            'move_entry',
            'delete_entry'
        )),
    parent_logical_path TEXT NOT NULL,
    entry_name TEXT NOT NULL,
    operation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (operation_status IN ('pending', 'completed', 'failed_conflict')),
    lease_token TEXT NOT NULL,
    lease_expires_at_ms INTEGER NOT NULL,
    result_entry_id TEXT,
    result_parent_id TEXT,
    result_entry_kind TEXT
        CHECK (result_entry_kind IS NULL OR result_entry_kind IN ('directory', 'file')),
    result_logical_path TEXT,
    result_revision TEXT,
    result_deleted INTEGER NOT NULL DEFAULT 0 CHECK (result_deleted IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sandbox_id) REFERENCES dr_drive_sandbox_volume(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, sandbox_id, actor_id, idempotency_key_hash)
);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_mutation_operation_pending
    ON dr_drive_sandbox_mutation_operation (operation_status, lease_expires_at_ms);
CREATE INDEX IF NOT EXISTS ix_dr_drive_sandbox_mutation_operation_sandbox_created
    ON dr_drive_sandbox_mutation_operation (tenant_id, sandbox_id, created_at);
