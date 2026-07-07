-- sdkwork:migration
-- version: 0004
-- engine: sqlite
-- module: drive
-- description: Install-worker maintenance leader lock for multi-process SQLite deployments.

CREATE TABLE IF NOT EXISTS dr_drive_maintenance_leader (
    lock_key TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL,
    acquired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
