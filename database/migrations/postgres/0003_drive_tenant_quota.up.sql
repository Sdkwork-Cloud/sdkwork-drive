-- sdkwork:migration
-- version: 0003
-- engine: postgres
-- module: drive
-- description: Tenant quota policy table used by quotas.summary app API.

CREATE TABLE IF NOT EXISTS dr_drive_tenant_quota (
    tenant_id VARCHAR(64) PRIMARY KEY,
    max_bytes BIGINT,
    updated_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT ck_dr_drive_tenant_quota_version
        CHECK (version >= 1),
    CONSTRAINT ck_dr_drive_tenant_quota_max_bytes
        CHECK (max_bytes IS NULL OR max_bytes > 0)
);
