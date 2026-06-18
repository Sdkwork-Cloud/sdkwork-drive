CREATE TABLE IF NOT EXISTS dr_drive_space (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    owner_subject_type TEXT NOT NULL,
    owner_subject_id TEXT NOT NULL,
    space_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    presentation_icon TEXT,
    presentation_color TEXT,
    description TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (owner_subject_type IN ('user', 'group', 'organization', 'app')),
    CHECK (space_type IN ('personal', 'team', 'knowledge_base', 'ai_generated', 'git_repository', 'deployment', 'app_upload', 'im', 'rtc', 'notary')),
    CHECK (space_type != 'git_repository' OR owner_subject_type = 'user'),
    CHECK (space_type != 'rtc' OR owner_subject_type = 'user'),
    CHECK (lifecycle_status IN ('active', 'archived', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_space_tenant_owner_type
    ON dr_drive_space (tenant_id, owner_subject_type, owner_subject_id, space_type);
CREATE INDEX IF NOT EXISTS ix_dr_drive_space_tenant_status
    ON dr_drive_space (tenant_id, lifecycle_status, updated_at);

CREATE TABLE IF NOT EXISTS dr_drive_space_knowledge_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    knowledge_base_id TEXT NOT NULL,
    ingestion_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_space_knowledge_profile_tenant_kb
    ON dr_drive_space_knowledge_profile (tenant_id, knowledge_base_id);

CREATE TABLE IF NOT EXISTS dr_drive_space_ai_generation_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    generation_scope TEXT NOT NULL,
    retention_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_space_ai_generation_profile_tenant_scope
    ON dr_drive_space_ai_generation_profile (tenant_id, generation_scope);

CREATE TABLE IF NOT EXISTS dr_drive_space_app_upload_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_resource_type TEXT NOT NULL,
    app_resource_id TEXT NOT NULL,
    upload_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_space_app_upload_profile_binding
    ON dr_drive_space_app_upload_profile (
        tenant_id,
        app_id,
        app_resource_type,
        app_resource_id
    );

CREATE TABLE IF NOT EXISTS dr_drive_space_rtc_profile (
    space_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    retention_policy_code TEXT NOT NULL DEFAULT 'default',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_space_rtc_profile_user
    ON dr_drive_space_rtc_profile (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dr_drive_node (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    space_type TEXT NOT NULL DEFAULT 'personal',
    parent_node_id TEXT,
    shortcut_target_node_id TEXT,
    node_type TEXT NOT NULL,
    node_name TEXT NOT NULL,
    scene TEXT,
    source TEXT,
    content_state TEXT NOT NULL DEFAULT 'empty',
    file_extension TEXT,
    head_content_type TEXT,
    head_content_type_group TEXT,
    head_content_length INTEGER,
    head_version_no INTEGER,
    head_checksum_sha256_hex TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES dr_drive_node(id) ON DELETE SET NULL,
    FOREIGN KEY (shortcut_target_node_id) REFERENCES dr_drive_node(id) ON DELETE SET NULL,
    CHECK (node_type IN ('file', 'folder', 'shortcut', 'virtual_reference')),
    CHECK (space_type IN ('personal', 'team', 'knowledge_base', 'ai_generated', 'git_repository', 'deployment', 'app_upload', 'im', 'rtc', 'notary')),
    CHECK (scene IS NULL OR (
        scene = trim(scene)
        AND length(scene) BETWEEN 1 AND 128
        AND scene NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (source IS NULL OR (
        source = trim(source)
        AND length(source) BETWEEN 1 AND 128
        AND source NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (content_state IN ('empty', 'uploading', 'ready', 'failed')),
    CHECK (lifecycle_status IN ('active', 'trashed', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_root_name_live
    ON dr_drive_node (tenant_id, space_id, node_name)
    WHERE parent_node_id IS NULL AND lifecycle_status != 'deleted';
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_child_name_live
    ON dr_drive_node (tenant_id, space_id, parent_node_id, node_name)
    WHERE parent_node_id IS NOT NULL AND lifecycle_status != 'deleted';
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_space_parent
    ON dr_drive_node (tenant_id, space_id, parent_node_id, updated_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_space_type_parent
    ON dr_drive_node (tenant_id, space_type, space_id, parent_node_id, lifecycle_status, updated_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_shortcut_target
    ON dr_drive_node (tenant_id, shortcut_target_node_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_asset_list
    ON dr_drive_node (tenant_id, node_type, lifecycle_status, updated_at, id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_asset_scene_source
    ON dr_drive_node (tenant_id, node_type, scene, source, lifecycle_status, updated_at, id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_space_parent_type
    ON dr_drive_node (tenant_id, space_id, parent_node_id, node_type, updated_at);

CREATE TRIGGER IF NOT EXISTS tr_dr_drive_node_space_type_sync_insert
AFTER INSERT ON dr_drive_node
FOR EACH ROW
WHEN NEW.space_type != (
    SELECT space_type
    FROM dr_drive_space
    WHERE tenant_id = NEW.tenant_id AND id = NEW.space_id
)
BEGIN
    UPDATE dr_drive_node
       SET space_type = (
           SELECT space_type
           FROM dr_drive_space
           WHERE tenant_id = NEW.tenant_id AND id = NEW.space_id
       )
     WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tr_dr_drive_node_space_type_sync_update
AFTER UPDATE OF tenant_id, space_id, space_type ON dr_drive_node
FOR EACH ROW
WHEN NEW.space_type != (
    SELECT space_type
    FROM dr_drive_space
    WHERE tenant_id = NEW.tenant_id AND id = NEW.space_id
)
BEGIN
    UPDATE dr_drive_node
       SET space_type = (
           SELECT space_type
           FROM dr_drive_space
           WHERE tenant_id = NEW.tenant_id AND id = NEW.space_id
       )
     WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS dr_drive_node_permission (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    role TEXT NOT NULL,
    inherited INTEGER NOT NULL DEFAULT 0,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (subject_type IN ('user', 'group', 'domain', 'app')),
    CHECK (role IN ('reader', 'commenter', 'writer', 'owner')),
    CHECK (inherited IN (0, 1)),
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_node_permission_resource
    ON dr_drive_node_permission (tenant_id, node_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_permission_subject
    ON dr_drive_node_permission (tenant_id, subject_type, subject_id, lifecycle_status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_permission_node_subject_live
    ON dr_drive_node_permission (tenant_id, node_id, subject_type, subject_id)
    WHERE lifecycle_status = 'active';

CREATE TABLE IF NOT EXISTS dr_drive_node_share_link (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    expires_at_epoch_ms INTEGER,
    download_limit INTEGER,
    download_count INTEGER NOT NULL DEFAULT 0,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (role IN ('reader', 'commenter', 'writer')),
    CHECK (expires_at_epoch_ms IS NULL OR expires_at_epoch_ms > 0),
    CHECK (download_limit IS NULL OR download_limit >= 0),
    CHECK (download_count >= 0),
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_share_link_token_hash
    ON dr_drive_node_share_link (token_hash);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_share_link_resource
    ON dr_drive_node_share_link (tenant_id, node_id, lifecycle_status);

CREATE TABLE IF NOT EXISTS dr_drive_node_comment (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    content TEXT NOT NULL,
    anchor TEXT,
    resolved INTEGER NOT NULL DEFAULT 0,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (resolved IN (0, 1)),
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_node_comment_node
    ON dr_drive_node_comment (tenant_id, node_id, lifecycle_status, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_comment_resolved
    ON dr_drive_node_comment (tenant_id, node_id, resolved, lifecycle_status, updated_at);

CREATE TABLE IF NOT EXISTS dr_drive_node_comment_reply (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    content TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES dr_drive_node_comment(id) ON DELETE CASCADE,
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_node_comment_reply_comment
    ON dr_drive_node_comment_reply (tenant_id, comment_id, lifecycle_status, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_comment_reply_node
    ON dr_drive_node_comment_reply (tenant_id, node_id, lifecycle_status, created_at);

CREATE TABLE IF NOT EXISTS dr_drive_node_favorite (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (subject_type IN ('user', 'group', 'domain', 'app')),
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_favorite_subject_node
    ON dr_drive_node_favorite (tenant_id, subject_type, subject_id, node_id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_favorite_subject
    ON dr_drive_node_favorite (tenant_id, subject_type, subject_id, lifecycle_status, updated_at);

CREATE TABLE IF NOT EXISTS dr_drive_node_property (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    property_key TEXT NOT NULL,
    property_value TEXT NOT NULL,
    visibility TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (visibility IN ('private', 'app_public')),
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_property_key
    ON dr_drive_node_property (tenant_id, node_id, property_key, visibility);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_property_node
    ON dr_drive_node_property (tenant_id, node_id, visibility, lifecycle_status, property_key);

CREATE TABLE IF NOT EXISTS dr_drive_label (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    label_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_label_key
    ON dr_drive_label (tenant_id, label_key);
CREATE INDEX IF NOT EXISTS ix_dr_drive_label_tenant_status
    ON dr_drive_label (tenant_id, lifecycle_status, label_key);

CREATE TABLE IF NOT EXISTS dr_drive_node_label (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES dr_drive_label(id) ON DELETE CASCADE,
    CHECK (lifecycle_status IN ('active', 'deleted')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_label_node_label
    ON dr_drive_node_label (tenant_id, node_id, label_id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_label_node
    ON dr_drive_node_label (tenant_id, node_id, lifecycle_status, label_id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_label_label
    ON dr_drive_node_label (tenant_id, label_id, lifecycle_status, node_id);

CREATE TABLE IF NOT EXISTS dr_drive_watch_channel (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT,
    node_id TEXT,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    channel_type TEXT NOT NULL DEFAULT 'web_hook',
    address TEXT NOT NULL,
    token_hash TEXT,
    expiration_epoch_ms INTEGER NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (resource_type IN ('changes', 'node')),
    CHECK (channel_type IN ('web_hook')),
    CHECK (expiration_epoch_ms > 0),
    CHECK (lifecycle_status IN ('active', 'stopped', 'expired')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_watch_channel_tenant_status
    ON dr_drive_watch_channel (tenant_id, lifecycle_status, expiration_epoch_ms);
CREATE INDEX IF NOT EXISTS ix_dr_drive_watch_channel_resource
    ON dr_drive_watch_channel (tenant_id, resource_type, resource_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_watch_channel_node
    ON dr_drive_watch_channel (tenant_id, node_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_watch_channel_expires
    ON dr_drive_watch_channel (tenant_id, lifecycle_status, expiration_epoch_ms);

CREATE TABLE IF NOT EXISTS dr_drive_change_cursor (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    last_sequence_no INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (last_sequence_no >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_change_cursor_scope
    ON dr_drive_change_cursor (tenant_id, space_id);

CREATE TABLE IF NOT EXISTS dr_drive_change_log (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT,
    sequence_no INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (sequence_no >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_change_log_space_sequence
    ON dr_drive_change_log (tenant_id, space_id, sequence_no);
CREATE INDEX IF NOT EXISTS ix_dr_drive_change_log_tenant_space_created
    ON dr_drive_change_log (tenant_id, space_id, created_at);

CREATE TABLE IF NOT EXISTS dr_drive_upload_session (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    storage_provider_id TEXT NOT NULL,
    storage_upload_id TEXT NOT NULL,
    state TEXT NOT NULL,
    expires_at_epoch_ms INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (storage_provider_id) REFERENCES dr_drive_storage_provider(id) ON DELETE RESTRICT,
    CHECK (
        bucket = trim(bucket)
        AND length(bucket) BETWEEN 1 AND 255
        AND bucket NOT GLOB '*[^A-Za-z0-9._-]*'
    ),
    CHECK (
        object_key = trim(object_key)
        AND length(CAST(object_key AS BLOB)) BETWEEN 1 AND 1024
        AND object_key NOT IN ('.', '..')
        AND object_key NOT GLOB '/*'
        AND object_key NOT GLOB '*/'
        AND object_key NOT GLOB '*//*'
        AND object_key NOT GLOB './*'
        AND object_key NOT GLOB '*/./*'
        AND object_key NOT GLOB '*/.'
        AND object_key NOT GLOB '../*'
        AND object_key NOT GLOB '*/../*'
        AND object_key NOT GLOB '*/..'
        AND instr(object_key, char(0)) = 0
    ),
    CHECK (expires_at_epoch_ms > 0),
    CHECK (state IN ('created', 'uploading', 'completing', 'completed', 'aborted', 'expired')),
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_upload_session_idempotency
    ON dr_drive_upload_session (tenant_id, space_id, node_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_dr_drive_upload_session_expires
    ON dr_drive_upload_session (tenant_id, state, expires_at_epoch_ms);

CREATE TABLE IF NOT EXISTS dr_drive_storage_provider (
    id TEXT PRIMARY KEY,
    provider_kind TEXT NOT NULL,
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    region TEXT,
    bucket TEXT NOT NULL,
    path_style INTEGER NOT NULL DEFAULT 1,
    strict_tls INTEGER NOT NULL DEFAULT 1,
    credential_ref TEXT,
    server_side_encryption_mode TEXT,
    default_storage_class TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        endpoint_url = trim(endpoint_url)
        AND instr(endpoint_url, ' ') = 0
        AND instr(endpoint_url, char(9)) = 0
        AND instr(endpoint_url, char(10)) = 0
        AND instr(endpoint_url, char(13)) = 0
        AND (
            (provider_kind = 'local_filesystem' AND lower(endpoint_url) GLOB 'file://?*')
            OR (
                provider_kind != 'local_filesystem'
                AND (
                    lower(endpoint_url) GLOB 'http://?*'
                    OR lower(endpoint_url) GLOB 'https://?*'
                )
            )
        )
    ),
    CHECK (
        bucket = trim(bucket)
        AND (
            (
                provider_kind = 'local_filesystem'
                AND length(bucket) BETWEEN 1 AND 255
                AND bucket NOT GLOB '*[^A-Za-z0-9._-]*'
            )
            OR (
                provider_kind != 'local_filesystem'
                AND length(bucket) BETWEEN 3 AND 63
                AND bucket NOT GLOB '*[^a-z0-9.-]*'
                AND bucket GLOB '[a-z0-9]*'
                AND bucket GLOB '*[a-z0-9]'
                AND bucket NOT GLOB '*..*'
                AND bucket NOT GLOB '*.-*'
                AND bucket NOT GLOB '*-.*'
                AND bucket NOT GLOB 'xn--*'
                AND bucket NOT GLOB 'sthree-*'
                AND bucket NOT GLOB '*-s3alias'
                AND bucket NOT GLOB '*--ol-s3'
                AND bucket NOT GLOB '*.mrap'
                AND bucket NOT GLOB '*--x-s3'
                AND NOT (
                    bucket GLOB '[0-9]*.[0-9]*.[0-9]*.[0-9]*'
                    AND bucket NOT GLOB '*[^0-9.]*'
                )
            )
        )
    ),
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
        OR (
            provider_kind GLOB 'custom:[a-z0-9_-]*'
            AND length(substr(provider_kind, 8)) BETWEEN 2 AND 32
        )
    ),
    CHECK (path_style IN (0, 1)),
    CHECK (strict_tls IN (0, 1)),
    CHECK (
        strict_tls = 0
        OR lower(endpoint_url) GLOB 'https://?*'
        OR lower(endpoint_url) GLOB 'file://?*'
    ),
    CHECK (status IN ('active', 'disabled', 'deleted')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_storage_provider_status
    ON dr_drive_storage_provider (status, updated_at);

CREATE TABLE IF NOT EXISTS dr_drive_storage_provider_binding (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT,
    provider_id TEXT NOT NULL,
    binding_scope TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'primary',
    storage_root_prefix TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES dr_drive_storage_provider(id) ON DELETE CASCADE,
    CHECK (binding_scope IN ('tenant', 'space', 'space_type')),
    CHECK (
        (binding_scope IN ('tenant', 'space') AND purpose = 'primary')
        OR (
            binding_scope = 'space_type'
            AND purpose IN (
                'personal', 'team', 'knowledge_base', 'ai_generated', 'git_repository',
                'deployment', 'app_upload', 'im', 'rtc', 'notary'
            )
        )
    ),
    CHECK (
        storage_root_prefix = trim(storage_root_prefix)
        AND length(CAST(storage_root_prefix AS BLOB)) BETWEEN 1 AND 512
        AND storage_root_prefix NOT IN ('.', '..')
        AND storage_root_prefix NOT GLOB '/*'
        AND storage_root_prefix NOT GLOB '*/'
        AND storage_root_prefix NOT GLOB '*//*'
        AND storage_root_prefix NOT GLOB './*'
        AND storage_root_prefix NOT GLOB '*/./*'
        AND storage_root_prefix NOT GLOB '*/.'
        AND storage_root_prefix NOT GLOB '../*'
        AND storage_root_prefix NOT GLOB '*/../*'
        AND storage_root_prefix NOT GLOB '*/..'
        AND instr(storage_root_prefix, char(0)) = 0
    ),
    CHECK (lifecycle_status IN ('active', 'disabled', 'deleted')),
    CHECK (version >= 1),
    CHECK (
        (binding_scope = 'tenant' AND space_id IS NULL)
        OR (binding_scope = 'space' AND space_id IS NOT NULL)
        OR (binding_scope = 'space_type' AND space_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_storage_provider_binding_lookup
    ON dr_drive_storage_provider_binding (tenant_id, space_id, purpose, lifecycle_status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_storage_provider_binding_provider
    ON dr_drive_storage_provider_binding (provider_id, lifecycle_status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_storage_provider_binding_tenant_primary_active
    ON dr_drive_storage_provider_binding (tenant_id, purpose)
    WHERE space_id IS NULL AND purpose = 'primary' AND lifecycle_status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_storage_provider_binding_space_primary_active
    ON dr_drive_storage_provider_binding (tenant_id, space_id, purpose)
    WHERE space_id IS NOT NULL AND purpose = 'primary' AND lifecycle_status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_storage_provider_binding_space_type_active
    ON dr_drive_storage_provider_binding (tenant_id, purpose)
    WHERE binding_scope = 'space_type' AND lifecycle_status = 'active';

CREATE TABLE IF NOT EXISTS dr_drive_download_package (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    state TEXT NOT NULL,
    storage_provider_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    archive_object_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/zip',
    file_count INTEGER NOT NULL,
    total_bytes INTEGER NOT NULL,
    archive_size_bytes INTEGER NOT NULL,
    requested_node_ids_json TEXT NOT NULL,
    item_manifest_json TEXT NOT NULL,
    expires_at_epoch_ms INTEGER NOT NULL,
    error_message TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (storage_provider_id) REFERENCES dr_drive_storage_provider(id) ON DELETE RESTRICT,
    CHECK (
        bucket = trim(bucket)
        AND length(bucket) BETWEEN 1 AND 255
        AND bucket NOT GLOB '*[^A-Za-z0-9._-]*'
    ),
    CHECK (
        archive_object_key = trim(archive_object_key)
        AND length(CAST(archive_object_key AS BLOB)) BETWEEN 1 AND 1024
        AND archive_object_key NOT IN ('.', '..')
        AND archive_object_key NOT GLOB '/*'
        AND archive_object_key NOT GLOB '*/'
        AND archive_object_key NOT GLOB '*//*'
        AND archive_object_key NOT GLOB './*'
        AND archive_object_key NOT GLOB '*/./*'
        AND archive_object_key NOT GLOB '*/.'
        AND archive_object_key NOT GLOB '../*'
        AND archive_object_key NOT GLOB '*/../*'
        AND archive_object_key NOT GLOB '*/..'
        AND instr(archive_object_key, char(0)) = 0
    ),
    CHECK (file_count >= 0),
    CHECK (total_bytes >= 0),
    CHECK (archive_size_bytes >= 0),
    CHECK (expires_at_epoch_ms > 0),
    CHECK (state IN ('creating', 'ready', 'failed', 'expired')),
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_download_package_tenant_state_created
    ON dr_drive_download_package (tenant_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_dr_drive_download_package_expires
    ON dr_drive_download_package (state, expires_at_epoch_ms);

CREATE TABLE IF NOT EXISTS dr_drive_audit_event (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    request_id TEXT,
    trace_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_audit_event_tenant_created
    ON dr_drive_audit_event (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_audit_event_resource
    ON dr_drive_audit_event (resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_audit_event_action_created
    ON dr_drive_audit_event (action, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_audit_event_request_created
    ON dr_drive_audit_event (request_id, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_audit_event_trace_created
    ON dr_drive_audit_event (trace_id, created_at);

CREATE TABLE IF NOT EXISTS dr_drive_maintenance_job (
    id BIGINT NOT NULL PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    dry_run INTEGER NOT NULL,
    scanned_count INTEGER NOT NULL,
    affected_count INTEGER NOT NULL,
    operator_id TEXT NOT NULL,
    request_id TEXT,
    trace_id TEXT,
    error_message TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (job_type IN (
        'object_sweep',
        'upload_session_sweep',
        'expired_upload_content_sweep',
        'abandoned_upload_task_sweep'
    )),
    CHECK (status IN ('completed', 'failed')),
    CHECK (dry_run IN (0, 1)),
    CHECK (scanned_count >= 0),
    CHECK (affected_count >= 0)
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_maintenance_job_type_created
    ON dr_drive_maintenance_job (job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_dr_drive_maintenance_job_status_created
    ON dr_drive_maintenance_job (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_dr_drive_maintenance_job_operator_created
    ON dr_drive_maintenance_job (operator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dr_drive_storage_object (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    storage_provider_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    object_key TEXT NOT NULL,
    scene TEXT,
    source TEXT,
    content_type TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    checksum_sha256_hex TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (storage_provider_id) REFERENCES dr_drive_storage_provider(id) ON DELETE RESTRICT,
    CHECK (
        bucket = trim(bucket)
        AND length(bucket) BETWEEN 1 AND 255
        AND bucket NOT GLOB '*[^A-Za-z0-9._-]*'
    ),
    CHECK (
        object_key = trim(object_key)
        AND length(CAST(object_key AS BLOB)) BETWEEN 1 AND 1024
        AND object_key NOT IN ('.', '..')
        AND object_key NOT GLOB '/*'
        AND object_key NOT GLOB '*/'
        AND object_key NOT GLOB '*//*'
        AND object_key NOT GLOB './*'
        AND object_key NOT GLOB '*/./*'
        AND object_key NOT GLOB '*/.'
        AND object_key NOT GLOB '../*'
        AND object_key NOT GLOB '*/../*'
        AND object_key NOT GLOB '*/..'
        AND instr(object_key, char(0)) = 0
    ),
    CHECK (scene IS NULL OR (
        scene = trim(scene)
        AND length(scene) BETWEEN 1 AND 128
        AND scene NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (source IS NULL OR (
        source = trim(source)
        AND length(source) BETWEEN 1 AND 128
        AND source NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (version_no >= 1),
    CHECK (
        content_type = trim(content_type)
        AND length(content_type) BETWEEN 3 AND 255
        AND content_type GLOB '*/*'
        AND content_type NOT GLOB '*/*/*'
        AND instr(content_type, ' ') = 0
        AND instr(content_type, char(9)) = 0
        AND instr(content_type, char(10)) = 0
        AND instr(content_type, char(13)) = 0
    ),
    CHECK (content_length >= 0),
    CHECK (
        length(checksum_sha256_hex) = 71
        AND checksum_sha256_hex GLOB 'sha256:[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
    ),
    CHECK (lifecycle_status IN ('active', 'deleted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_storage_object_node_version
    ON dr_drive_storage_object (tenant_id, node_id, version_no);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_storage_object_active_locator
    ON dr_drive_storage_object (tenant_id, node_id, storage_provider_id, bucket, object_key)
    WHERE lifecycle_status = 'active';
CREATE INDEX IF NOT EXISTS ix_dr_drive_storage_object_node_latest
    ON dr_drive_storage_object (tenant_id, node_id, lifecycle_status, version_no DESC);

CREATE TABLE IF NOT EXISTS dr_drive_node_version (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    storage_object_id TEXT,
    content_type TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    checksum_sha256_hex TEXT NOT NULL,
    version_kind TEXT NOT NULL DEFAULT 'auto',
    version_label TEXT,
    change_source TEXT NOT NULL DEFAULT 'app_api',
    change_summary TEXT,
    restored_from_version_id TEXT,
    app_id TEXT,
    app_resource_type TEXT,
    app_resource_id TEXT,
    scene TEXT,
    source TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (storage_object_id) REFERENCES dr_drive_storage_object(id) ON DELETE SET NULL,
    FOREIGN KEY (restored_from_version_id) REFERENCES dr_drive_node_version(id) ON DELETE SET NULL,
    CHECK (version_no >= 1),
    CHECK (
        content_type = trim(content_type)
        AND length(content_type) BETWEEN 3 AND 255
        AND content_type GLOB '*/*'
        AND content_type NOT GLOB '*/*/*'
        AND instr(content_type, ' ') = 0
        AND instr(content_type, char(9)) = 0
        AND instr(content_type, char(10)) = 0
        AND instr(content_type, char(13)) = 0
    ),
    CHECK (content_length >= 0),
    CHECK (
        length(checksum_sha256_hex) = 71
        AND checksum_sha256_hex GLOB 'sha256:[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
    ),
    CHECK (version_kind IN ('auto', 'manual', 'restore', 'import', 'ai_generated', 'system')),
    CHECK (version_label IS NULL OR (version_label = trim(version_label) AND length(version_label) BETWEEN 1 AND 128)),
    CHECK (change_source IN ('app_api', 'backend_api', 'uploader', 'sync', 'ai', 'import', 'restore', 'system')),
    CHECK (change_summary IS NULL OR (change_summary = trim(change_summary) AND length(change_summary) BETWEEN 1 AND 1024)),
    CHECK (app_id IS NULL OR (app_id = trim(app_id) AND length(app_id) BETWEEN 1 AND 128 AND app_id NOT GLOB '*[^A-Za-z0-9._:@-]*')),
    CHECK (app_resource_type IS NULL OR (app_resource_type = trim(app_resource_type) AND length(app_resource_type) BETWEEN 1 AND 64 AND app_resource_type NOT GLOB '*[^A-Za-z0-9._:@-]*')),
    CHECK (app_resource_id IS NULL OR (app_resource_id = trim(app_resource_id) AND length(app_resource_id) BETWEEN 1 AND 128 AND app_resource_id NOT GLOB '*[^A-Za-z0-9._:@-]*')),
    CHECK (scene IS NULL OR (
        scene = trim(scene)
        AND length(scene) BETWEEN 1 AND 128
        AND scene NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (source IS NULL OR (
        source = trim(source)
        AND length(source) BETWEEN 1 AND 128
        AND source NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (lifecycle_status IN ('active', 'deleted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_version_node_version
    ON dr_drive_node_version (tenant_id, node_id, version_no);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_version_node_latest
    ON dr_drive_node_version (tenant_id, node_id, lifecycle_status, version_no DESC);
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_version_storage_object
    ON dr_drive_node_version (tenant_id, storage_object_id)
    WHERE storage_object_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_dr_drive_node_version_app_resource
    ON dr_drive_node_version (tenant_id, app_id, app_resource_type, app_resource_id, created_at DESC)
    WHERE app_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dr_drive_space_version_policy (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    versioning_enabled INTEGER NOT NULL DEFAULT 1,
    default_version_kind TEXT NOT NULL DEFAULT 'auto',
    retention_mode TEXT NOT NULL DEFAULT 'unlimited',
    max_versions INTEGER,
    retention_days INTEGER,
    keep_deleted_versions INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    CHECK (versioning_enabled IN (0, 1)),
    CHECK (default_version_kind IN ('auto', 'manual', 'restore', 'import', 'ai_generated', 'system')),
    CHECK (retention_mode IN ('unlimited', 'max_versions', 'time_window')),
    CHECK (max_versions IS NULL OR max_versions >= 1),
    CHECK (retention_days IS NULL OR retention_days >= 1),
    CHECK (keep_deleted_versions IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_space_version_policy_space
    ON dr_drive_space_version_policy (tenant_id, space_id);

CREATE TABLE IF NOT EXISTS dr_drive_node_version_policy (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    versioning_enabled INTEGER NOT NULL DEFAULT 1,
    default_version_kind TEXT NOT NULL DEFAULT 'auto',
    retention_mode TEXT NOT NULL DEFAULT 'unlimited',
    max_versions INTEGER,
    retention_days INTEGER,
    keep_deleted_versions INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    CHECK (versioning_enabled IN (0, 1)),
    CHECK (default_version_kind IN ('auto', 'manual', 'restore', 'import', 'ai_generated', 'system')),
    CHECK (retention_mode IN ('unlimited', 'max_versions', 'time_window')),
    CHECK (max_versions IS NULL OR max_versions >= 1),
    CHECK (retention_days IS NULL OR retention_days >= 1),
    CHECK (keep_deleted_versions IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_node_version_policy_node
    ON dr_drive_node_version_policy (tenant_id, node_id);

CREATE TABLE IF NOT EXISTS dr_drive_upload_item (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    user_id TEXT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    app_resource_type TEXT NOT NULL,
    app_resource_id TEXT NOT NULL,
    scene TEXT,
    source TEXT,
    upload_profile_code TEXT NOT NULL,
    file_fingerprint TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    upload_session_id TEXT,
    storage_provider_id TEXT,
    storage_upload_id TEXT,
    original_file_name TEXT NOT NULL,
    file_extension TEXT,
    content_type TEXT NOT NULL,
    content_type_group TEXT NOT NULL,
    detected_content_type TEXT,
    content_length INTEGER NOT NULL,
    checksum_sha256_hex TEXT,
    chunk_size_bytes INTEGER NOT NULL,
    total_parts INTEGER NOT NULL,
    uploaded_parts_count INTEGER NOT NULL DEFAULT 0,
    uploaded_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    retention_mode TEXT NOT NULL,
    retention_expires_at_epoch_ms INTEGER,
    cleanup_action TEXT,
    hard_delete_after_epoch_ms INTEGER,
    cleanup_status TEXT NOT NULL DEFAULT 'active',
    post_process_status TEXT NOT NULL DEFAULT 'not_required',
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (upload_session_id) REFERENCES dr_drive_upload_session(id) ON DELETE SET NULL,
    FOREIGN KEY (storage_provider_id) REFERENCES dr_drive_storage_provider(id) ON DELETE SET NULL,
    CHECK (actor_type IN ('anonymous', 'user', 'system')),
    CHECK (scene IS NULL OR (
        scene = trim(scene)
        AND length(scene) BETWEEN 1 AND 128
        AND scene NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (source IS NULL OR (
        source = trim(source)
        AND length(source) BETWEEN 1 AND 128
        AND source NOT GLOB '*[^A-Za-z0-9._:@-]*'
    )),
    CHECK (upload_profile_code IN (
        'generic', 'video', 'image', 'audio', 'document', 'archive',
        'text', 'dataset', 'attachment', 'avatar', 'thumbnail'
    )),
    CHECK (
        content_type = trim(content_type)
        AND length(content_type) BETWEEN 3 AND 255
        AND content_type GLOB '*/*'
        AND content_type NOT GLOB '*/*/*'
        AND instr(content_type, ' ') = 0
        AND instr(content_type, char(9)) = 0
        AND instr(content_type, char(10)) = 0
        AND instr(content_type, char(13)) = 0
    ),
    CHECK (content_length >= 0),
    CHECK (chunk_size_bytes > 0),
    CHECK (total_parts >= 1),
    CHECK (uploaded_parts_count >= 0),
    CHECK (uploaded_bytes >= 0),
    CHECK (status IN ('prepared', 'uploading', 'paused', 'completing', 'completed', 'failed', 'cancelled', 'expired')),
    CHECK (retention_mode IN ('temporary', 'long_term')),
    CHECK (
        (retention_mode = 'long_term' AND retention_expires_at_epoch_ms IS NULL AND cleanup_action IS NULL)
        OR
        (retention_mode = 'temporary' AND retention_expires_at_epoch_ms IS NOT NULL AND cleanup_action IN ('soft_delete', 'hard_delete'))
    ),
    CHECK (cleanup_status IN ('active', 'expired', 'soft_deleted', 'hard_deleted', 'failed')),
    CHECK (post_process_status IN ('not_required', 'pending', 'processing', 'completed', 'failed')),
    CHECK (
        checksum_sha256_hex IS NULL
        OR (
            length(checksum_sha256_hex) = 71
            AND substr(checksum_sha256_hex, 1, 7) = 'sha256:'
            AND substr(checksum_sha256_hex, 8) NOT GLOB '*[^0123456789abcdef]*'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_upload_item_task
    ON dr_drive_upload_item (tenant_id, task_id);
CREATE INDEX IF NOT EXISTS ix_dr_drive_upload_item_fingerprint
    ON dr_drive_upload_item (tenant_id, file_fingerprint, status);
CREATE INDEX IF NOT EXISTS ix_dr_drive_upload_item_retention
    ON dr_drive_upload_item (tenant_id, cleanup_status, retention_expires_at_epoch_ms);
CREATE INDEX IF NOT EXISTS ix_dr_drive_upload_item_usage_scope
    ON dr_drive_upload_item (
        tenant_id, organization_id, user_id, app_id,
        scene, source, upload_profile_code, content_type_group, cleanup_status
    );

CREATE TABLE IF NOT EXISTS dr_drive_upload_part (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    upload_item_id TEXT NOT NULL,
    upload_session_id TEXT NOT NULL,
    part_no INTEGER NOT NULL,
    offset_bytes INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    etag TEXT NOT NULL,
    checksum_sha256_hex TEXT,
    status TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    uploaded_at_epoch_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_item_id) REFERENCES dr_drive_upload_item(id) ON DELETE CASCADE,
    FOREIGN KEY (upload_session_id) REFERENCES dr_drive_upload_session(id) ON DELETE CASCADE,
    CHECK (part_no BETWEEN 1 AND 10000),
    CHECK (offset_bytes >= 0),
    CHECK (size_bytes > 0),
    CHECK (status IN ('pending', 'uploading', 'uploaded', 'failed')),
    CHECK (retry_count >= 0),
    CHECK (
        checksum_sha256_hex IS NULL
        OR (
            length(checksum_sha256_hex) = 71
            AND checksum_sha256_hex GLOB 'sha256:[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dr_drive_upload_part_item_part
    ON dr_drive_upload_part (tenant_id, upload_item_id, part_no);
CREATE INDEX IF NOT EXISTS ix_dr_drive_upload_part_session
    ON dr_drive_upload_part (tenant_id, upload_session_id, status, part_no);

CREATE TABLE IF NOT EXISTS dr_drive_file_sensitive_operation (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,
    user_id TEXT,
    space_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    storage_object_id TEXT,
    upload_item_id TEXT,
    operation_type TEXT NOT NULL,
    operation_reason TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_type_group TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    checksum_sha256_hex TEXT,
    object_bucket TEXT,
    object_key TEXT,
    before_lifecycle_status TEXT,
    after_lifecycle_status TEXT,
    operator_id TEXT NOT NULL,
    maintenance_job_id BIGINT,
    request_id TEXT,
    trace_id TEXT,
    object_delete_status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES dr_drive_space(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES dr_drive_node(id) ON DELETE CASCADE,
    FOREIGN KEY (storage_object_id) REFERENCES dr_drive_storage_object(id) ON DELETE SET NULL,
    FOREIGN KEY (upload_item_id) REFERENCES dr_drive_upload_item(id) ON DELETE SET NULL,
    FOREIGN KEY (maintenance_job_id) REFERENCES dr_drive_maintenance_job(id) ON DELETE SET NULL,
    CHECK (operation_type IN (
        'upload_completed',
        'soft_delete',
        'hard_delete',
        'restore',
        'share_created',
        'share_revoked',
        'permission_changed',
        'download_granted',
        'retention_expired'
    )),
    CHECK (operation_reason IN (
        'user_request',
        'retention_expired',
        'manual',
        'admin',
        'quota_policy',
        'system'
    )),
    CHECK (content_length >= 0),
    CHECK (object_delete_status IN ('not_required', 'deleted', 'missing', 'failed')),
    CHECK (
        checksum_sha256_hex IS NULL
        OR (
            length(checksum_sha256_hex) = 71
            AND checksum_sha256_hex GLOB 'sha256:[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
        )
    )
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_file_sensitive_operation_upload_item
    ON dr_drive_file_sensitive_operation (tenant_id, upload_item_id, created_at);
CREATE INDEX IF NOT EXISTS ix_dr_drive_file_sensitive_operation_tenant_created
    ON dr_drive_file_sensitive_operation (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS dr_drive_domain_outbox (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    node_id TEXT,
    event_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TEXT,
    CHECK (delivery_status IN ('pending', 'delivered', 'failed'))
);

CREATE INDEX IF NOT EXISTS ix_dr_drive_domain_outbox_pending
    ON dr_drive_domain_outbox (delivery_status, created_at);
