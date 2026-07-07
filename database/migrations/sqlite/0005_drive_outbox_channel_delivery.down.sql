-- sdkwork:migration
-- version: 0005
-- engine: sqlite

DROP INDEX IF EXISTS ix_dr_drive_domain_outbox_channel_delivery_channel;
DROP TABLE IF EXISTS dr_drive_domain_outbox_channel_delivery;
