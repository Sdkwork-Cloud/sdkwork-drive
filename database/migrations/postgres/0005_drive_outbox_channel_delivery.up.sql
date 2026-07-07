-- sdkwork:migration
-- version: 0005
-- engine: postgres
-- module: drive
-- description: Per-channel outbox webhook delivery ledger for idempotent fan-out.

CREATE TABLE IF NOT EXISTS dr_drive_domain_outbox_channel_delivery (
    outbox_id VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (outbox_id, channel_id),
    CONSTRAINT fk_dr_drive_domain_outbox_channel_delivery_outbox_id
        FOREIGN KEY (outbox_id) REFERENCES dr_drive_domain_outbox(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_channel_delivery_channel
    ON dr_drive_domain_outbox_channel_delivery (channel_id, delivered_at DESC);
