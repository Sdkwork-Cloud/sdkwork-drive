CREATE TABLE IF NOT EXISTS drive_space (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    owner_subject_type TEXT NOT NULL,
    owner_subject_id TEXT NOT NULL,
    space_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_space_tenant_owner_type
    ON drive_space (tenant_id, owner_subject_type, owner_subject_id, space_type);
CREATE INDEX IF NOT EXISTS ix_drive_space_tenant_status
    ON drive_space (tenant_id, lifecycle_status, updated_at);

CREATE TABLE IF NOT EXISTS drive_knowledge_space_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    knowledge_base_id TEXT NOT NULL,
    ingestion_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_knowledge_profile_tenant_kb
    ON drive_knowledge_space_profile (tenant_id, knowledge_base_id);

CREATE TABLE IF NOT EXISTS drive_ai_generation_space_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    generation_scope TEXT NOT NULL,
    retention_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_drive_ai_profile_tenant_scope
    ON drive_ai_generation_space_profile (tenant_id, generation_scope);

CREATE TABLE IF NOT EXISTS drive_app_upload_space_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_resource_type TEXT NOT NULL,
    app_resource_id TEXT NOT NULL,
    upload_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_app_upload_profile_binding
    ON drive_app_upload_space_profile (
        tenant_id,
        app_id,
        app_resource_type,
        app_resource_id
    );

CREATE TABLE IF NOT EXISTS drive_node (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    parent_node_id TEXT,
    node_type TEXT NOT NULL,
    node_name TEXT NOT NULL,
    content_state TEXT NOT NULL DEFAULT 'empty',
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_node_parent_name
    ON drive_node (tenant_id, space_id, parent_node_id, node_name, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_drive_node_space_parent
    ON drive_node (tenant_id, space_id, parent_node_id, updated_at);

CREATE TABLE IF NOT EXISTS drive_upload_session (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    state TEXT NOT NULL,
    expires_at_epoch_ms INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES drive_node(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_upload_session_idempotency
    ON drive_upload_session (tenant_id, space_id, node_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_drive_upload_session_expires
    ON drive_upload_session (tenant_id, state, expires_at_epoch_ms);

CREATE TABLE IF NOT EXISTS drive_storage_provider (
    id TEXT PRIMARY KEY,
    provider_kind TEXT NOT NULL,
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    region TEXT,
    bucket TEXT NOT NULL,
    path_style INTEGER NOT NULL DEFAULT 1,
    credential_ref TEXT,
    server_side_encryption_mode TEXT,
    default_storage_class TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_drive_storage_provider_status
    ON drive_storage_provider (status, updated_at);

CREATE TABLE IF NOT EXISTS drive_audit_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    request_id TEXT,
    trace_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_drive_audit_event_tenant_created
    ON drive_audit_event (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_resource
    ON drive_audit_event (resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_action_created
    ON drive_audit_event (action, created_at);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_request_created
    ON drive_audit_event (request_id, created_at);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_trace_created
    ON drive_audit_event (trace_id, created_at);

CREATE TABLE IF NOT EXISTS drive_maintenance_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    dry_run INTEGER NOT NULL,
    scanned_count INTEGER NOT NULL,
    affected_count INTEGER NOT NULL,
    operator_id TEXT NOT NULL,
    request_id TEXT,
    trace_id TEXT,
    error_message TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_type_created
    ON drive_maintenance_job (job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_status_created
    ON drive_maintenance_job (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_operator_created
    ON drive_maintenance_job (operator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS drive_storage_object (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    checksum_sha256_hex TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES drive_node(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_storage_object_node_version
    ON drive_storage_object (tenant_id, node_id, version_no);
CREATE INDEX IF NOT EXISTS ix_drive_storage_object_node_latest
    ON drive_storage_object (tenant_id, node_id, lifecycle_status, version_no DESC);
