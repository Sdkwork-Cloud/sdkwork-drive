-- sdkwork:migration
-- version: 0004
-- engine: postgres
-- module: drive
-- description: Install-worker maintenance leader lock for SQLite parity and cross-engine leader metadata.

CREATE TABLE IF NOT EXISTS dr_drive_maintenance_leader (
    lock_key VARCHAR(64) PRIMARY KEY,
    holder_id VARCHAR(128) NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
