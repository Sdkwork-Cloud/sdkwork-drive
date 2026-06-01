CREATE TABLE IF NOT EXISTS drive_space (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    owner_subject_type VARCHAR(32) NOT NULL,
    owner_subject_id VARCHAR(128) NOT NULL,
    space_type VARCHAR(32) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_space_tenant_owner_type
    ON drive_space (tenant_id, owner_subject_type, owner_subject_id, space_type);
CREATE INDEX IF NOT EXISTS ix_drive_space_tenant_status
    ON drive_space (tenant_id, lifecycle_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS drive_knowledge_space_profile (
    space_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    knowledge_base_id VARCHAR(128) NOT NULL,
    ingestion_policy_code VARCHAR(64) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_knowledge_space_profile_space_id
        FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_knowledge_profile_tenant_kb
    ON drive_knowledge_space_profile (tenant_id, knowledge_base_id);

CREATE TABLE IF NOT EXISTS drive_ai_generation_space_profile (
    space_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    generation_scope VARCHAR(64) NOT NULL,
    retention_policy_code VARCHAR(64) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_ai_generation_space_profile_space_id
        FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_drive_ai_profile_tenant_scope
    ON drive_ai_generation_space_profile (tenant_id, generation_scope);

CREATE TABLE IF NOT EXISTS drive_app_upload_space_profile (
    space_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(128) NOT NULL,
    app_resource_type VARCHAR(64) NOT NULL,
    app_resource_id VARCHAR(128) NOT NULL,
    upload_policy_code VARCHAR(64) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_app_upload_space_profile_space_id
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
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    space_id VARCHAR(64) NOT NULL,
    parent_node_id VARCHAR(64),
    node_type VARCHAR(32) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    content_state VARCHAR(32) NOT NULL DEFAULT 'empty',
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_node_space_id
        FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_node_parent_name
    ON drive_node (tenant_id, space_id, parent_node_id, node_name, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_drive_node_space_parent
    ON drive_node (tenant_id, space_id, parent_node_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS drive_upload_session (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    space_id VARCHAR(64) NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    object_key TEXT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    state VARCHAR(32) NOT NULL,
    expires_at_epoch_ms BIGINT NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_upload_session_space_id
        FOREIGN KEY (space_id) REFERENCES drive_space(id) ON DELETE CASCADE,
    CONSTRAINT fk_drive_upload_session_node_id
        FOREIGN KEY (node_id) REFERENCES drive_node(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_upload_session_idempotency
    ON drive_upload_session (tenant_id, space_id, node_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_drive_upload_session_expires
    ON drive_upload_session (tenant_id, state, expires_at_epoch_ms);

CREATE TABLE IF NOT EXISTS drive_storage_provider (
    id VARCHAR(64) PRIMARY KEY,
    provider_kind VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    endpoint_url TEXT NOT NULL,
    region VARCHAR(128),
    bucket VARCHAR(255) NOT NULL,
    path_style BOOLEAN NOT NULL DEFAULT TRUE,
    credential_ref VARCHAR(255),
    server_side_encryption_mode VARCHAR(64),
    default_storage_class VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_drive_storage_provider_status
    ON drive_storage_provider (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS drive_audit_event (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    operator_id VARCHAR(128) NOT NULL,
    request_id VARCHAR(64),
    trace_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_drive_audit_event_tenant_created
    ON drive_audit_event (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_resource
    ON drive_audit_event (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_action_created
    ON drive_audit_event (action, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_request_created
    ON drive_audit_event (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_audit_event_trace_created
    ON drive_audit_event (trace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS drive_maintenance_job (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    dry_run BOOLEAN NOT NULL,
    scanned_count BIGINT NOT NULL,
    affected_count BIGINT NOT NULL,
    operator_id VARCHAR(128) NOT NULL,
    request_id VARCHAR(64),
    trace_id VARCHAR(128),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_type_created
    ON drive_maintenance_job (job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_status_created
    ON drive_maintenance_job (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_drive_maintenance_job_operator_created
    ON drive_maintenance_job (operator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS drive_storage_object (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    version_no BIGINT NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    object_key TEXT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    content_length BIGINT NOT NULL,
    checksum_sha256_hex VARCHAR(255) NOT NULL,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_by VARCHAR(128) NOT NULL,
    updated_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drive_storage_object_node_id
        FOREIGN KEY (node_id) REFERENCES drive_node(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_drive_storage_object_node_version
    ON drive_storage_object (tenant_id, node_id, version_no);
CREATE INDEX IF NOT EXISTS ix_drive_storage_object_node_latest
    ON drive_storage_object (tenant_id, node_id, lifecycle_status, version_no DESC);
