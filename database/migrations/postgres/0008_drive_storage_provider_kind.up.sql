-- Storage provider kind registry: built-in provider brands with an
-- enable/disable switch. One kind owns many provider configurations
-- (dr_drive_storage_provider rows); custom:<vendor> kinds are implicit and
-- never stored here.

CREATE TABLE IF NOT EXISTS dr_drive_storage_provider_kind (
    provider_kind VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_dr_drive_storage_provider_kind_provider_kind
        CHECK (
            provider_kind IN (
                'local_filesystem',
                's3_compatible',
                'google_cloud_storage',
                'aliyun_oss',
                'tencent_cos',
                'huawei_obs',
                'volcengine_tos'
            )
        ),
    CONSTRAINT ck_dr_drive_storage_provider_kind_display_name
        CHECK (display_name = btrim(display_name) AND length(display_name) BETWEEN 1 AND 128),
    CONSTRAINT ck_dr_drive_storage_provider_kind_version
        CHECK (version >= 1)
);

-- Initialize the built-in provider kind catalog. Idempotent: re-running the
-- migration (or the admin initialize endpoint) never duplicates rows and
-- never flips an operator-managed enabled flag.
INSERT INTO dr_drive_storage_provider_kind (provider_kind, display_name, enabled, sort_order)
VALUES
    ('local_filesystem', 'Local Filesystem', TRUE, 1),
    ('s3_compatible', 'Amazon S3 / S3 Compatible', TRUE, 2),
    ('google_cloud_storage', 'Google Cloud Storage', TRUE, 3),
    ('aliyun_oss', 'Alibaba Cloud OSS', TRUE, 4),
    ('tencent_cos', 'Tencent Cloud COS', TRUE, 5),
    ('huawei_obs', 'Huawei Cloud OBS', TRUE, 6),
    ('volcengine_tos', 'Volcengine TOS', TRUE, 7)
ON CONFLICT (provider_kind) DO NOTHING;
