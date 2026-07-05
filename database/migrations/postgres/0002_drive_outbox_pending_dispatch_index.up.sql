-- sdkwork:migration
-- version: 0002
-- engine: postgres
-- module: drive
-- description: Partial index for pending domain outbox polling at scale.

CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_pending_dispatch
    ON dr_drive_domain_outbox (attempt_count, created_at)
    WHERE delivery_status = 'pending';
