-- sdkwork:migration
-- version: 0002
-- engine: sqlite
-- module: drive

DROP INDEX IF EXISTS ix_dr_drive_domain_outbox_pending_dispatch;
