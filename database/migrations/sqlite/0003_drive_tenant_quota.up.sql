-- sdkwork:migration
-- version: 0003
-- engine: sqlite
-- module: drive
-- description: Tenant quota policy table used by quotas.summary app API.

CREATE TABLE IF NOT EXISTS dr_drive_tenant_quota (
    tenant_id TEXT PRIMARY KEY,
    max_bytes INTEGER,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    CHECK (version >= 1),
    CHECK (max_bytes IS NULL OR max_bytes > 0)
);
