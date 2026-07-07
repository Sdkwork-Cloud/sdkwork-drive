-- sdkwork:migration
-- version: 0005
-- engine: sqlite
-- module: drive
-- description: Per-channel outbox webhook delivery ledger for idempotent fan-out.

CREATE TABLE IF NOT EXISTS dr_drive_domain_outbox_channel_delivery (
    outbox_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    delivered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (outbox_id, channel_id),
    FOREIGN KEY (outbox_id) REFERENCES dr_drive_domain_outbox(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_channel_delivery_channel
    ON dr_drive_domain_outbox_channel_delivery (channel_id, delivered_at DESC);
