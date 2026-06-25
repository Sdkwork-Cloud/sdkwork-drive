-- sdkwork:migration
-- version: 0002
-- engine: postgres
-- module: drive
-- description: Drop partial index for pending domain outbox polling.

DROP INDEX IF EXISTS ix_dr_drive_domain_outbox_pending_dispatch;
