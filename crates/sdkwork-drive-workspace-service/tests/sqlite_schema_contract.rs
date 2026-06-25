use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;

#[tokio::test]
async fn sqlite_schema_uses_drive_nodes_for_global_assets() {
    let pool = create_sqlite_schema().await;

    for table_name in [
        "dr_asset_item",
        "dr_asset_resource_ref",
        "dr_asset_version",
        "dr_asset_relation",
        "dr_asset_collection",
        "dr_asset_collection_item",
        "dr_asset_event",
        "dr_asset_projection",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(table_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite asset table lookup should succeed");
        assert_eq!(
            count, 0,
            "global assets must not duplicate Drive nodes with table: {table_name}"
        );
    }

    for index_name in [
        "ix_dr_drive_node_asset_list",
        "ix_dr_drive_node_asset_scene_source",
        "ix_dr_drive_storage_object_node_latest",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='index' AND name=?1")
                .bind(index_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite asset index lookup should succeed");
        assert_eq!(
            count, 1,
            "expected Drive-backed asset index exists: {index_name}"
        );
    }
}

#[tokio::test]
async fn sqlite_installer_uses_dr_drive_prefix_for_all_drive_tables() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");

    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema installation should succeed");

    for table_name in [
        "dr_drive_space",
        "dr_drive_space_knowledge_profile",
        "dr_drive_space_ai_generation_profile",
        "dr_drive_space_app_upload_profile",
        "dr_drive_space_rtc_profile",
        "dr_drive_node",
        "dr_drive_node_permission",
        "dr_drive_node_share_link",
        "dr_drive_node_comment",
        "dr_drive_node_comment_reply",
        "dr_drive_node_favorite",
        "dr_drive_node_property",
        "dr_drive_label",
        "dr_drive_node_label",
        "dr_drive_watch_channel",
        "dr_drive_change_cursor",
        "dr_drive_change_log",
        "dr_drive_domain_outbox",
        "dr_drive_upload_session",
        "dr_drive_storage_provider",
        "dr_drive_storage_provider_binding",
        "dr_drive_download_package",
        "dr_drive_audit_event",
        "dr_drive_maintenance_job",
        "dr_drive_storage_object",
        "dr_drive_node_version",
        "dr_drive_space_version_policy",
        "dr_drive_node_version_policy",
        "dr_drive_upload_item",
        "dr_drive_upload_part",
        "dr_drive_file_sensitive_operation",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(table_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite table lookup should succeed");
        assert_eq!(
            count, 1,
            "expected semantically complete dr_drive-prefixed table exists: {table_name}"
        );
    }

    for stale_table_name in [
        "dr_space",
        "dr_node",
        "dr_permission",
        "dr_share_link",
        "dr_comment",
        "dr_comment_reply",
        "dr_label",
        "dr_change_log",
        "dr_storage_provider",
        "dr_storage_object",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(stale_table_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite stale table lookup should succeed");
        assert_eq!(
            count, 0,
            "stale short Drive table name must not be created: {stale_table_name}"
        );
    }
}

#[tokio::test]
async fn sqlite_installer_creates_special_space_profile_tables() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");

    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema installation should succeed");

    for table_name in [
        "dr_drive_space_knowledge_profile",
        "dr_drive_space_ai_generation_profile",
        "dr_drive_space_app_upload_profile",
        "dr_drive_space_rtc_profile",
        "dr_drive_node_permission",
        "dr_drive_node_share_link",
        "dr_drive_node_comment",
        "dr_drive_node_comment_reply",
        "dr_drive_node_favorite",
        "dr_drive_node_property",
        "dr_drive_label",
        "dr_drive_node_label",
        "dr_drive_watch_channel",
        "dr_drive_change_cursor",
        "dr_drive_change_log",
        "dr_drive_domain_outbox",
        "dr_drive_storage_provider",
        "dr_drive_storage_provider_binding",
        "dr_drive_audit_event",
        "dr_drive_maintenance_job",
        "dr_drive_upload_item",
        "dr_drive_upload_part",
        "dr_drive_file_sensitive_operation",
        "dr_drive_node_version",
        "dr_drive_space_version_policy",
        "dr_drive_node_version_policy",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name=?1")
                .bind(table_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite table lookup should succeed");
        assert_eq!(count, 1, "expected table exists: {table_name}");
    }

    for index_name in [
        "ux_dr_drive_space_rtc_profile_user",
        "ix_dr_drive_node_permission_resource",
        "ix_dr_drive_node_permission_subject",
        "ux_dr_drive_node_permission_node_subject_live",
        "ux_dr_drive_node_share_link_token_hash",
        "ix_dr_drive_node_share_link_resource",
        "ix_dr_drive_node_comment_node",
        "ix_dr_drive_node_comment_resolved",
        "ix_dr_drive_node_comment_reply_comment",
        "ix_dr_drive_node_comment_reply_node",
        "ux_dr_drive_node_favorite_subject_node",
        "ix_dr_drive_node_favorite_subject",
        "ux_dr_drive_node_property_key",
        "ix_dr_drive_node_property_node",
        "ux_dr_drive_label_key",
        "ix_dr_drive_label_tenant_status",
        "ux_dr_drive_node_label_node_label",
        "ix_dr_drive_node_label_node",
        "ix_dr_drive_node_label_label",
        "ix_dr_drive_watch_channel_tenant_status",
        "ix_dr_drive_watch_channel_resource",
        "ix_dr_drive_watch_channel_node",
        "ix_dr_drive_watch_channel_expires",
        "ux_dr_drive_node_root_name_live",
        "ux_dr_drive_node_child_name_live",
        "ix_dr_drive_node_shortcut_target",
        "ix_dr_drive_node_space_type_parent",
        "ux_dr_drive_change_cursor_scope",
        "ux_dr_drive_change_log_space_sequence",
        "ix_dr_drive_change_log_tenant_space_created",
        "ix_dr_drive_domain_outbox_pending",
        "ix_dr_drive_audit_event_tenant_created",
        "ix_dr_drive_audit_event_resource",
        "ix_dr_drive_audit_event_action_created",
        "ix_dr_drive_audit_event_request_created",
        "ix_dr_drive_audit_event_trace_created",
        "ix_dr_drive_storage_provider_binding_lookup",
        "ix_dr_drive_storage_provider_binding_provider",
        "ux_dr_drive_storage_provider_binding_tenant_primary_active",
        "ux_dr_drive_storage_provider_binding_space_primary_active",
        "ux_dr_drive_storage_provider_binding_space_type_active",
        "ux_dr_drive_node_version_node_version",
        "ix_dr_drive_node_version_node_latest",
        "ix_dr_drive_node_version_storage_object",
        "ix_dr_drive_node_version_app_resource",
        "ux_dr_drive_space_version_policy_space",
        "ux_dr_drive_node_version_policy_node",
        "ux_dr_drive_upload_item_task",
        "ix_dr_drive_upload_item_fingerprint",
        "ix_dr_drive_upload_item_retention",
        "ux_dr_drive_upload_part_item_part",
        "ix_dr_drive_upload_part_session",
        "ix_dr_drive_file_sensitive_operation_upload_item",
        "ix_dr_drive_file_sensitive_operation_tenant_created",
    ] {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(1) FROM sqlite_master WHERE type='index' AND name=?1")
                .bind(index_name)
                .fetch_one(&pool)
                .await
                .expect("sqlite index lookup should succeed");
        assert_eq!(count, 1, "expected index exists: {index_name}");
    }

    let shortcut_target_column_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM pragma_table_info('dr_drive_node')
         WHERE name='shortcut_target_node_id'",
    )
    .fetch_one(&pool)
    .await
    .expect("sqlite dr_drive_node column lookup should succeed");
    assert_eq!(
        shortcut_target_column_count, 1,
        "dr_drive_node should expose shortcut_target_node_id"
    );

    let space_type_column_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM pragma_table_info('dr_drive_node')
         WHERE name='space_type'",
    )
    .fetch_one(&pool)
    .await
    .expect("sqlite dr_drive_node space_type column lookup should succeed");
    assert_eq!(
        space_type_column_count, 1,
        "dr_drive_node should denormalize space_type for high-frequency file queries"
    );

    for column_name in ["scene", "source"] {
        let column_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM pragma_table_info('dr_drive_upload_item')
             WHERE name=?1",
        )
        .bind(column_name)
        .fetch_one(&pool)
        .await
        .expect("sqlite dr_drive_upload_item column lookup should succeed");
        assert_eq!(
            column_count, 1,
            "dr_drive_upload_item should expose {column_name}"
        );
    }

    for table_name in ["dr_drive_node", "dr_drive_storage_object"] {
        for column_name in ["scene", "source"] {
            let column_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(1)
                 FROM pragma_table_info(?1)
                 WHERE name=?2",
            )
            .bind(table_name)
            .bind(column_name)
            .fetch_one(&pool)
            .await
            .expect("sqlite usage context column lookup should succeed");
            assert_eq!(column_count, 1, "{table_name} should expose {column_name}");
        }
    }
}

#[tokio::test]
async fn sqlite_schema_storage_provider_has_strict_tls_policy_column_and_constraint() {
    let pool = create_sqlite_schema().await;

    let strict_tls_column_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM pragma_table_info('dr_drive_storage_provider')
         WHERE name='strict_tls'",
    )
    .fetch_one(&pool)
    .await
    .expect("sqlite dr_drive_storage_provider column lookup should succeed");
    assert_eq!(
        strict_tls_column_count, 1,
        "dr_drive_storage_provider should persist provider-level strict_tls"
    );

    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, strict_tls, status,
            version, created_by, updated_by
         ) VALUES (
            'provider-https-strict', 's3_compatible', 'HTTPS Strict',
            'https://storage.example.com', 'bucket-https-strict', 1, 1,
            'active', 1, 'admin-schema', 'admin-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept strict_tls=true for https endpoints");

    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, strict_tls, status,
            version, created_by, updated_by
         ) VALUES (
            'provider-http-private', 's3_compatible', 'HTTP Private S3',
            'http://127.0.0.1:9000', 'bucket-http-private', 1, 0,
            'active', 1, 'admin-schema', 'admin-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept strict_tls=false for private http endpoints");

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, strict_tls, status,
                version, created_by, updated_by
             ) VALUES (
                'provider-http-strict-invalid', 's3_compatible', 'HTTP Strict Invalid',
                'http://127.0.0.1:9000', 'bucket-http-strict', 1, 1,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject strict_tls=true for http endpoints"
    );
}

#[tokio::test]
async fn sqlite_schema_accepts_user_git_repository_space_type() {
    let pool = create_sqlite_schema().await;

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-git-repository-source', 'tenant-schema', 'user', 'user-schema',
            'git_repository', 'Git Repositories', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept the user git repository space type");
}

#[tokio::test]
async fn sqlite_schema_accepts_deployment_space_type() {
    let pool = create_sqlite_schema().await;

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-deployment-app', 'tenant-schema', 'app', 'app-schema',
            'deployment', 'Deployments', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept deployment spaces for deployed website and app content");
}

#[tokio::test]
async fn sqlite_schema_accepts_user_rtc_space_type() {
    let pool = create_sqlite_schema().await;

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-rtc-records', 'tenant-schema', 'user', 'user-schema', 'rtc',
            'RTC Records', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept the user RTC recording space type");
}

#[tokio::test]
async fn sqlite_schema_accepts_user_im_space_type() {
    let pool = create_sqlite_schema().await;

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-im-chat', 'tenant-schema', 'user', 'user-schema', 'im',
            'IM', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept the user IM space type");
}

#[tokio::test]
async fn sqlite_schema_accepts_notary_space_type_and_node_denormalization() {
    let pool = create_sqlite_schema().await;

    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-notary-case-files', 'tenant-schema', 'organization', 'org-schema',
            'notary', 'Notary Case Files', 'active', 1, 'member-schema', 'member-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept organization-owned notary spaces");

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, space_type, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'folder-notary-case', 'tenant-schema', 'space-notary-case-files', 'notary',
            NULL, 'folder', 'case-202606100001', 'empty', 'active', 1,
            'member-schema', 'member-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept notary nodes with denormalized space_type");

    let persisted: String =
        sqlx::query_scalar("SELECT space_type FROM dr_drive_node WHERE id='folder-notary-case'")
            .fetch_one(&pool)
            .await
            .expect("notary node space_type should be queryable without joining dr_drive_space");
    assert_eq!(persisted, "notary");
}

#[tokio::test]
async fn sqlite_schema_rejects_non_user_git_repository_space_owner() {
    let pool = create_sqlite_schema().await;

    let result = sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-git-repository-group-owner', 'tenant-schema', 'group', 'group-schema',
            'git_repository', 'Git Repositories', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_err(),
        "schema must reject git repository spaces not owned by a user"
    );
}

#[tokio::test]
async fn sqlite_schema_rejects_non_user_rtc_space_owner() {
    let pool = create_sqlite_schema().await;

    let result = sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (
            'space-rtc-group-owner', 'tenant-schema', 'group', 'group-schema', 'rtc',
            'RTC Records', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_err(),
        "schema must reject RTC recording spaces not owned by a user"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_live_node_name_uniqueness_for_root_and_child_nodes() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-uniq").await;
    insert_node(
        &pool,
        "folder-root-1",
        "space-uniq",
        None,
        "folder",
        "Reports",
        "active",
    )
    .await
    .expect("first root folder insert should succeed");

    let duplicate_root = insert_node(
        &pool,
        "folder-root-2",
        "space-uniq",
        None,
        "folder",
        "Reports",
        "active",
    )
    .await;
    assert!(
        duplicate_root.is_err(),
        "schema must reject duplicate live root node names because API preflight checks can race"
    );

    insert_node(
        &pool,
        "folder-root-deleted",
        "space-uniq",
        None,
        "folder",
        "Reports",
        "deleted",
    )
    .await
    .expect("deleted root folder name should be reusable");

    insert_node(
        &pool,
        "folder-parent",
        "space-uniq",
        None,
        "folder",
        "Parent",
        "active",
    )
    .await
    .expect("parent folder insert should succeed");
    insert_node(
        &pool,
        "child-1",
        "space-uniq",
        Some("folder-parent"),
        "file",
        "Roadmap.pdf",
        "active",
    )
    .await
    .expect("first child insert should succeed");

    let duplicate_child = insert_node(
        &pool,
        "child-2",
        "space-uniq",
        Some("folder-parent"),
        "file",
        "Roadmap.pdf",
        "active",
    )
    .await;
    assert!(
        duplicate_child.is_err(),
        "schema must reject duplicate live child node names in the same parent"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_foreign_keys_after_installation() {
    let pool = create_sqlite_schema().await;

    let result = insert_node(
        &pool,
        "orphan-node",
        "missing-space",
        None,
        "file",
        "orphan.txt",
        "active",
    )
    .await;

    assert!(
        result.is_err(),
        "SQLite runtime must enable foreign keys so nodes cannot reference a missing space"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_parent_node_foreign_key() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-parent-fk").await;

    let result = insert_node(
        &pool,
        "child-with-missing-parent",
        "space-parent-fk",
        Some("missing-parent"),
        "file",
        "orphan-child.txt",
        "active",
    )
    .await;

    assert!(
        result.is_err(),
        "schema must reject child nodes whose parent_node_id does not reference an existing node"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_upload_session_storage_provider_foreign_key() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-upload-provider-fk").await;
    insert_node(
        &pool,
        "node-upload-provider-fk",
        "space-upload-provider-fk",
        None,
        "file",
        "provider-fk.txt",
        "active",
    )
    .await
    .expect("upload target node should be inserted");

    let result = sqlx::query(
        "INSERT INTO dr_drive_upload_session (
            id, tenant_id, space_id, node_id, bucket, object_key,
            idempotency_key, storage_provider_id, storage_upload_id, state,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (
            'upload-missing-provider', 'tenant-schema', 'space-upload-provider-fk',
            'node-upload-provider-fk', 'bucket-schema', 'objects/missing-provider.txt',
            'idem-missing-provider', 'missing-provider', 'storage-upload-missing-provider',
            'created', 1800000000000, 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_err(),
        "schema must reject upload sessions whose storage_provider_id does not reference a configured provider"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_single_active_default_storage_binding_per_scope() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-binding").await;
    seed_provider(&pool, "provider-binding-a").await;
    seed_provider(&pool, "provider-binding-b").await;

    insert_storage_binding(
        &pool,
        "binding-tenant-a",
        None,
        "provider-binding-a",
        "tenant",
        "active",
    )
    .await
    .expect("first tenant default binding should succeed");
    let duplicate_tenant_binding = insert_storage_binding(
        &pool,
        "binding-tenant-b",
        None,
        "provider-binding-b",
        "tenant",
        "active",
    )
    .await;
    assert!(
        duplicate_tenant_binding.is_err(),
        "schema must reject multiple active tenant default storage bindings"
    );

    insert_storage_binding(
        &pool,
        "binding-tenant-deleted",
        None,
        "provider-binding-b",
        "tenant",
        "deleted",
    )
    .await
    .expect("deleted tenant binding should not occupy the active default slot");

    insert_storage_binding(
        &pool,
        "binding-space-a",
        Some("space-binding"),
        "provider-binding-a",
        "space",
        "active",
    )
    .await
    .expect("first space default binding should succeed");
    let duplicate_space_binding = insert_storage_binding(
        &pool,
        "binding-space-b",
        Some("space-binding"),
        "provider-binding-b",
        "space",
        "active",
    )
    .await;
    assert!(
        duplicate_space_binding.is_err(),
        "schema must reject multiple active space default storage bindings"
    );
}

#[tokio::test]
async fn sqlite_schema_enforces_single_live_permission_per_node_subject() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-permission-uniq").await;
    insert_node(
        &pool,
        "node-permission-uniq",
        "space-permission-uniq",
        None,
        "file",
        "acl.txt",
        "active",
    )
    .await
    .expect("permission target node should be inserted");

    insert_permission(
        &pool,
        "permission-user-reader",
        "node-permission-uniq",
        "user",
        "user-reviewer",
        "reader",
        "active",
    )
    .await
    .expect("first live permission should be inserted");

    let duplicate_permission = insert_permission(
        &pool,
        "permission-user-writer",
        "node-permission-uniq",
        "user",
        "user-reviewer",
        "writer",
        "active",
    )
    .await;
    assert!(
        duplicate_permission.is_err(),
        "schema must reject multiple live permissions for the same node and subject"
    );

    insert_permission(
        &pool,
        "permission-user-deleted",
        "node-permission-uniq",
        "user",
        "user-reviewer",
        "writer",
        "deleted",
    )
    .await
    .expect("deleted permission history should not occupy the live ACL slot");
}

#[tokio::test]
async fn sqlite_schema_rejects_negative_share_link_download_counters() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-share-counter").await;
    insert_node(
        &pool,
        "node-share-counter",
        "space-share-counter",
        None,
        "file",
        "share-counter.txt",
        "active",
    )
    .await
    .expect("share target node should be inserted");

    assert!(
        insert_share_link(&pool, "share-negative-limit", "node-share-counter", -1, 0)
            .await
            .is_err(),
        "schema must reject negative share download limits"
    );
    assert!(
        insert_share_link(&pool, "share-negative-count", "node-share-counter", 3, -1)
            .await
            .is_err(),
        "schema must reject negative share download counters"
    );

    insert_share_link(&pool, "share-zero-limit", "node-share-counter", 0, 0)
        .await
        .expect("zero download limit should be accepted as an immediate limit");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_storage_object_numeric_values() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-storage-object-values").await;
    seed_provider(&pool, "provider-schema").await;
    insert_node(
        &pool,
        "node-storage-object-values",
        "space-storage-object-values",
        None,
        "file",
        "object-values.txt",
        "active",
    )
    .await
    .expect("storage object target node should be inserted");

    assert!(
        insert_storage_object(
            &pool,
            "storage-object-zero-version",
            "node-storage-object-values",
            0,
            1,
        )
        .await
        .is_err(),
        "schema must reject storage object version numbers below 1"
    );
    assert!(
        insert_storage_object(
            &pool,
            "storage-object-negative-length",
            "node-storage-object-values",
            1,
            -1,
        )
        .await
        .is_err(),
        "schema must reject negative storage object content length"
    );

    insert_storage_object(
        &pool,
        "storage-object-empty-file",
        "node-storage-object-values",
        1,
        0,
    )
    .await
    .expect("empty file storage object should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_storage_object_content_metadata() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-storage-object-metadata").await;
    seed_provider(&pool, "provider-schema").await;
    insert_node(
        &pool,
        "node-storage-object-metadata",
        "space-storage-object-metadata",
        None,
        "file",
        "object-metadata.txt",
        "active",
    )
    .await
    .expect("storage object target node should be inserted");

    for (index, content_type, checksum) in [
        (
            "space",
            "application/octet stream",
            valid_storage_checksum(),
        ),
        ("missing-slash", "application", valid_storage_checksum()),
        (
            "double-slash",
            "application/octet/stream",
            valid_storage_checksum(),
        ),
        (
            "checksum-prefix",
            "application/octet-stream",
            "md5:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        (
            "checksum-short",
            "application/octet-stream",
            "sha256:abc123",
        ),
        (
            "checksum-uppercase",
            "application/octet-stream",
            "sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ),
    ] {
        assert!(
            insert_storage_object_with_metadata(
                &pool,
                &format!("storage-object-invalid-metadata-{index}"),
                "node-storage-object-metadata",
                content_type,
                checksum,
            )
            .await
            .is_err(),
            "schema must reject invalid storage object metadata: {content_type:?} {checksum:?}"
        );
    }

    insert_storage_object_with_metadata(
        &pool,
        "storage-object-valid-metadata",
        "node-storage-object-metadata",
        "application/octet-stream",
        valid_storage_checksum(),
    )
    .await
    .expect("standard storage object metadata should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_storage_object_keys() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-object-key-values").await;
    seed_provider(&pool, "provider-schema").await;
    insert_node(
        &pool,
        "node-object-key-values",
        "space-object-key-values",
        None,
        "file",
        "object-key-values.txt",
        "active",
    )
    .await
    .expect("storage object target node should be inserted");

    for (index, object_key) in [
        "",
        ".",
        "..",
        " object-key ",
        "/leading-slash",
        "trailing-slash/",
        "objects//double-slash",
        "objects/./content",
        "objects/../content",
    ]
    .into_iter()
    .enumerate()
    {
        assert!(
            insert_storage_object_with_key(
                &pool,
                &format!("storage-object-invalid-key-{index}"),
                "node-object-key-values",
                object_key,
            )
            .await
            .is_err(),
            "schema must reject invalid storage object keys: {object_key:?}"
        );
    }

    let too_long_key = "a".repeat(1025);
    assert!(
        insert_storage_object_with_key(
            &pool,
            "storage-object-too-long-key",
            "node-object-key-values",
            &too_long_key,
        )
        .await
        .is_err(),
        "schema must reject storage object keys above the S3 1024-byte key limit"
    );

    insert_storage_object_with_key(
        &pool,
        "storage-object-valid-key",
        "node-object-key-values",
        "sdkwork-drive/v1/t/aa/tenants/tenant-schema/spaces/space-object-key-values/nodes/n/bb/node-object-key-values/versions/0000000001/object-valid/content",
    )
    .await
    .expect("standard drive storage object key should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_duplicate_active_storage_object_locators() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-storage-object-locator").await;
    seed_provider(&pool, "provider-schema").await;
    insert_node(
        &pool,
        "node-storage-object-locator",
        "space-storage-object-locator",
        None,
        "file",
        "object-locator.txt",
        "active",
    )
    .await
    .expect("storage object target node should be inserted");

    insert_storage_object_with_key_and_version(
        &pool,
        "storage-object-locator-v1",
        "node-storage-object-locator",
        "objects/stable-locator.txt",
        1,
        "active",
    )
    .await
    .expect("first active storage object locator should be accepted");

    assert!(
        insert_storage_object_with_key_and_version(
            &pool,
            "storage-object-locator-v2",
            "node-storage-object-locator",
            "objects/stable-locator.txt",
            2,
            "active",
        )
        .await
        .is_err(),
        "schema must reject duplicate active storage object locators"
    );

    insert_storage_object_with_key_and_version(
        &pool,
        "storage-object-locator-deleted",
        "node-storage-object-locator",
        "objects/stable-locator.txt",
        2,
        "deleted",
    )
    .await
    .expect("deleted storage object locator history should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_upload_session_object_keys() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-upload-key-values").await;
    seed_provider(&pool, "provider-upload-key-values").await;
    insert_node(
        &pool,
        "node-upload-key-values",
        "space-upload-key-values",
        None,
        "file",
        "upload-key-values.txt",
        "active",
    )
    .await
    .expect("upload session target node should be inserted");

    for (index, object_key) in [
        "",
        ".",
        "..",
        " upload-key ",
        "/leading-slash",
        "trailing-slash/",
        "uploads//double-slash",
        "uploads/./content",
        "uploads/../content",
    ]
    .into_iter()
    .enumerate()
    {
        assert!(
            insert_upload_session_with_key(
                &pool,
                &format!("upload-invalid-key-{index}"),
                "space-upload-key-values",
                "node-upload-key-values",
                object_key,
            )
            .await
            .is_err(),
            "schema must reject invalid upload session object keys: {object_key:?}"
        );
    }

    let too_long_key = "a".repeat(1025);
    assert!(
        insert_upload_session_with_key(
            &pool,
            "upload-too-long-key",
            "space-upload-key-values",
            "node-upload-key-values",
            &too_long_key,
        )
        .await
        .is_err(),
        "schema must reject upload object keys above the S3 1024-byte key limit"
    );

    insert_upload_session_with_key(
        &pool,
        "upload-valid-key",
        "space-upload-key-values",
        "node-upload-key-values",
        "sdkwork-drive/v1/t/aa/tenants/tenant-schema/spaces/space-upload-key-values/nodes/n/bb/node-upload-key-values/versions/0000000001/upload-valid/content",
    )
    .await
    .expect("standard drive upload object key should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_runtime_storage_buckets() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-runtime-bucket-values").await;
    seed_provider(&pool, "provider-schema").await;
    seed_provider(&pool, "provider-runtime-bucket-values").await;
    insert_node(
        &pool,
        "node-runtime-bucket-values",
        "space-runtime-bucket-values",
        None,
        "file",
        "runtime-bucket-values.txt",
        "active",
    )
    .await
    .expect("runtime bucket target node should be inserted");

    for (index, bucket) in ["", " bucket ", "bucket/segment", "bucket\\segment"]
        .into_iter()
        .enumerate()
    {
        assert!(
            insert_storage_object_with_bucket(
                &pool,
                &format!("storage-object-invalid-bucket-{index}"),
                "node-runtime-bucket-values",
                bucket,
            )
            .await
            .is_err(),
            "schema must reject invalid storage object bucket values: {bucket:?}"
        );
        assert!(
            insert_upload_session_with_bucket(
                &pool,
                &format!("upload-invalid-bucket-{index}"),
                "space-runtime-bucket-values",
                "node-runtime-bucket-values",
                bucket,
            )
            .await
            .is_err(),
            "schema must reject invalid upload session bucket values: {bucket:?}"
        );
        assert!(
            insert_download_package_with_bucket(
                &pool,
                &format!("package-invalid-bucket-{index}"),
                "provider-runtime-bucket-values",
                bucket,
            )
            .await
            .is_err(),
            "schema must reject invalid download package bucket values: {bucket:?}"
        );
    }
}

#[tokio::test]
async fn sqlite_schema_rejects_negative_download_package_counters() {
    let pool = create_sqlite_schema().await;
    seed_provider(&pool, "provider-package-counters").await;

    assert!(
        insert_download_package(
            &pool,
            "package-negative-files",
            "provider-package-counters",
            -1,
            0,
            0,
        )
        .await
        .is_err(),
        "schema must reject negative download package file counts"
    );
    assert!(
        insert_download_package(
            &pool,
            "package-negative-total",
            "provider-package-counters",
            0,
            -1,
            0,
        )
        .await
        .is_err(),
        "schema must reject negative download package total bytes"
    );
    assert!(
        insert_download_package(
            &pool,
            "package-negative-archive",
            "provider-package-counters",
            0,
            0,
            -1,
        )
        .await
        .is_err(),
        "schema must reject negative download package archive size"
    );

    insert_download_package(
        &pool,
        "package-zero-counters",
        "provider-package-counters",
        0,
        0,
        0,
    )
    .await
    .expect("zero download package counters should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_download_package_archive_keys() {
    let pool = create_sqlite_schema().await;
    seed_provider(&pool, "provider-package-key-values").await;

    for (index, archive_object_key) in [
        "",
        ".",
        "..",
        " archive.zip ",
        "/archives/package.zip",
        "archives/",
        "archives//package.zip",
        "archives/./package.zip",
        "archives/../package.zip",
    ]
    .into_iter()
    .enumerate()
    {
        assert!(
            insert_download_package_with_key(
                &pool,
                &format!("package-invalid-key-{index}"),
                "provider-package-key-values",
                archive_object_key,
            )
            .await
            .is_err(),
            "schema must reject invalid download package archive object keys: {archive_object_key:?}"
        );
    }

    let too_long_key = "a".repeat(1025);
    assert!(
        insert_download_package_with_key(
            &pool,
            "package-too-long-key",
            "provider-package-key-values",
            &too_long_key,
        )
        .await
        .is_err(),
        "schema must reject archive object keys above the S3 1024-byte key limit"
    );

    insert_download_package_with_key(
        &pool,
        "package-valid-key",
        "provider-package-key-values",
        "sdkwork-drive/v1/t/aa/tenants/tenant-schema/packages/package-valid.zip",
    )
    .await
    .expect("standard archive object key should be accepted");
}

#[tokio::test]
async fn sqlite_schema_rejects_non_positive_expiration_timestamps() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-expiration-values").await;
    seed_provider(&pool, "provider-expiration-values").await;
    insert_node(
        &pool,
        "node-expiration-values",
        "space-expiration-values",
        None,
        "file",
        "expiration-values.txt",
        "active",
    )
    .await
    .expect("expiration target node should be inserted");

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_watch_channel (
                id, tenant_id, space_id, node_id, resource_type, resource_id,
                channel_type, address, expiration_epoch_ms, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'watch-zero-expiration', 'tenant-schema', 'space-expiration-values',
                'node-expiration-values', 'node', 'node-expiration-values',
                'web_hook', 'https://hooks.example.com/drive', 0, 'active',
                1, 'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject watch channels with non-positive expiration timestamps"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_node_share_link (
                id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
                download_limit, download_count, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'share-negative-expiration', 'tenant-schema', 'node-expiration-values',
                'share-negative-expiration-token-hash', 'reader', -1,
                NULL, 0, 'active', 1, 'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject share links with negative expiration timestamps"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_upload_session (
                id, tenant_id, space_id, node_id, bucket, object_key,
                idempotency_key, storage_provider_id, storage_upload_id, state,
                expires_at_epoch_ms, version, created_by, updated_by
             ) VALUES (
                'upload-zero-expiration', 'tenant-schema', 'space-expiration-values',
                'node-expiration-values', 'bucket-schema', 'object-schema',
                'idem-zero-expiration', 'provider-expiration-values',
                'storage-upload-zero-expiration', 'created', 0, 1,
                'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject upload sessions with non-positive expiration timestamps"
    );
    assert!(
        insert_download_package_with_expiration(
            &pool,
            "package-zero-expiration",
            "provider-expiration-values",
            0,
            0,
            0,
            0,
        )
        .await
        .is_err(),
        "schema must reject download packages with non-positive expiration timestamps"
    );
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_boolean_values() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-boolean-values").await;
    seed_provider(&pool, "provider-boolean-values").await;
    insert_node(
        &pool,
        "node-boolean-values",
        "space-boolean-values",
        None,
        "file",
        "boolean-values.txt",
        "active",
    )
    .await
    .expect("boolean target node should be inserted");

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_node_permission (
                id, tenant_id, node_id, subject_type, subject_id, role,
                inherited, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'permission-invalid-inherited', 'tenant-schema', 'node-boolean-values',
                'user', 'user-reviewer', 'reader', 2, 'active', 1,
                'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject non-boolean permission inheritance markers"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_node_comment (
                id, tenant_id, node_id, content, resolved, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'comment-invalid-resolved', 'tenant-schema', 'node-boolean-values',
                'Invalid boolean', 2, 'active', 1, 'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject non-boolean comment resolved markers"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style,
                status, version, created_by, updated_by
             ) VALUES (
                'provider-invalid-path-style', 's3_compatible', 'Invalid Boolean',
                'https://s3.example.com', 'bucket-invalid-boolean', 2,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject non-boolean storage provider path style values"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_maintenance_job (
                id, job_type, status, dry_run, scanned_count, affected_count,
                operator_id, started_at, finished_at
             ) VALUES (
                9101, 'object_sweep', 'completed', 2, 0, 0, 'admin-schema',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject non-boolean maintenance dry-run markers"
    );
}

#[tokio::test]
async fn sqlite_schema_rejects_negative_sequences_and_maintenance_counts() {
    let pool = create_sqlite_schema().await;

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_change_cursor (
                id, tenant_id, space_id, last_sequence_no
             ) VALUES (
                'cursor-negative-sequence', 'tenant-schema', 'space-sequence', -1
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject negative change cursor sequence numbers"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_change_log (
                id, tenant_id, space_id, node_id, sequence_no, event_type, actor_id
             ) VALUES (
                9102, 'tenant-schema', 'space-sequence', NULL, 0,
                'node.changed', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject change log sequence numbers below 1"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_maintenance_job (
                id, job_type, status, dry_run, scanned_count, affected_count,
                operator_id, started_at, finished_at
             ) VALUES (
                9103, 'object_sweep', 'completed', 0, -1, 0, 'admin-schema',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject negative maintenance scanned counts"
    );
    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_maintenance_job (
                id, job_type, status, dry_run, scanned_count, affected_count,
                operator_id, started_at, finished_at
             ) VALUES (
                9104, 'upload_session_sweep', 'completed', 0, 0, -1, 'admin-schema',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "schema must reject negative maintenance affected counts"
    );
}

#[tokio::test]
async fn sqlite_schema_rejects_non_positive_entity_versions() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-version-base").await;
    seed_provider(&pool, "provider-version-base").await;
    insert_node(
        &pool,
        "node-version-base",
        "space-version-base",
        None,
        "file",
        "version-base.txt",
        "active",
    )
    .await
    .expect("version target node should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_label (
            id, tenant_id, label_key, display_name, lifecycle_status,
            version, created_by, updated_by
         ) VALUES (
            'label-version-base', 'tenant-schema', 'label-version-base',
            'Version Base', 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("version target label should be inserted");
    sqlx::query(
        "INSERT INTO dr_drive_node_comment (
            id, tenant_id, node_id, content, resolved, lifecycle_status,
            version, created_by, updated_by
         ) VALUES (
            'comment-version-base', 'tenant-schema', 'node-version-base',
            'Version base', 0, 'active', 1, 'user-schema', 'user-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("version target comment should be inserted");

    let invalid_version_inserts = [
        (
            "dr_drive_space",
            "INSERT INTO dr_drive_space (
                id, tenant_id, owner_subject_type, owner_subject_id, space_type,
                display_name, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'space-invalid-version', 'tenant-schema', 'user', 'user-version',
                'personal', 'Invalid Version', 'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node",
            "INSERT INTO dr_drive_node (
                id, tenant_id, space_id, parent_node_id, node_type, node_name,
                content_state, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'node-invalid-version', 'tenant-schema', 'space-version-base', NULL,
                'file', 'invalid-version.txt', 'empty', 'active', 0,
                'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_permission",
            "INSERT INTO dr_drive_node_permission (
                id, tenant_id, node_id, subject_type, subject_id, role,
                inherited, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'permission-invalid-version', 'tenant-schema', 'node-version-base',
                'user', 'user-version', 'reader', 0, 'active', 0,
                'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_share_link",
            "INSERT INTO dr_drive_node_share_link (
                id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
                download_limit, download_count, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'share-invalid-version', 'tenant-schema', 'node-version-base',
                'share-invalid-version-token-hash', 'reader', NULL, NULL, 0,
                'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_comment",
            "INSERT INTO dr_drive_node_comment (
                id, tenant_id, node_id, content, resolved, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'comment-invalid-version', 'tenant-schema', 'node-version-base',
                'Invalid version', 0, 'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_comment_reply",
            "INSERT INTO dr_drive_node_comment_reply (
                id, tenant_id, node_id, comment_id, content, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'reply-invalid-version', 'tenant-schema', 'node-version-base',
                'comment-version-base', 'Invalid version', 'active', 0,
                'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_favorite",
            "INSERT INTO dr_drive_node_favorite (
                id, tenant_id, node_id, subject_type, subject_id, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'favorite-invalid-version', 'tenant-schema', 'node-version-base',
                'user', 'user-version', 'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_property",
            "INSERT INTO dr_drive_node_property (
                id, tenant_id, node_id, property_key, property_value, visibility,
                lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'property-invalid-version', 'tenant-schema', 'node-version-base',
                'invalid-version', 'true', 'private', 'active', 0,
                'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_label",
            "INSERT INTO dr_drive_label (
                id, tenant_id, label_key, display_name, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'label-invalid-version', 'tenant-schema', 'label-invalid-version',
                'Invalid Version', 'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_node_label",
            "INSERT INTO dr_drive_node_label (
                id, tenant_id, node_id, label_id, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'node-label-invalid-version', 'tenant-schema', 'node-version-base',
                'label-version-base', 'active', 0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_watch_channel",
            "INSERT INTO dr_drive_watch_channel (
                id, tenant_id, space_id, node_id, resource_type, resource_id,
                channel_type, address, expiration_epoch_ms, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (
                'watch-invalid-version', 'tenant-schema', 'space-version-base',
                'node-version-base', 'node', 'node-version-base', 'web_hook',
                'https://hooks.example.com/drive', 1800000000000, 'active',
                0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_upload_session",
            "INSERT INTO dr_drive_upload_session (
                id, tenant_id, space_id, node_id, bucket, object_key,
                idempotency_key, storage_provider_id, storage_upload_id, state,
                expires_at_epoch_ms, version, created_by, updated_by
             ) VALUES (
                'upload-invalid-version', 'tenant-schema', 'space-version-base',
                'node-version-base', 'bucket-schema', 'object-version',
                'idem-invalid-version', 'provider-version-base',
                'storage-upload-invalid-version', 'created', 1800000000000,
                0, 'user-schema', 'user-schema'
             )",
        ),
        (
            "dr_drive_storage_provider",
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, status,
                version, created_by, updated_by
             ) VALUES (
                'provider-invalid-version', 's3_compatible', 'Invalid Version',
                'https://s3.example.com', 'bucket-invalid-version', 1, 'active',
                0, 'admin-schema', 'admin-schema'
             )",
        ),
        (
            "dr_drive_storage_provider_binding",
            "INSERT INTO dr_drive_storage_provider_binding (
                id, tenant_id, space_id, provider_id, binding_scope, purpose,
                storage_root_prefix, lifecycle_status, version, created_by, updated_by
             ) VALUES (
                'binding-invalid-version', 'tenant-schema', NULL, 'provider-version-base',
                'tenant', 'primary', 'sdkwork-drive/v1/tenants/tenant-schema',
                'active', 0, 'admin-schema', 'admin-schema'
             )",
        ),
        (
            "dr_drive_download_package",
            "INSERT INTO dr_drive_download_package (
                id, tenant_id, package_name, state, storage_provider_id, bucket,
                archive_object_key, content_type, file_count, total_bytes,
                archive_size_bytes, requested_node_ids_json, item_manifest_json,
                expires_at_epoch_ms, version, created_by, updated_by
             ) VALUES (
                'package-invalid-version', 'tenant-schema', 'Invalid Version',
                'ready', 'provider-version-base', 'bucket-schema',
                'archives/package-invalid-version.zip', 'application/zip',
                0, 0, 0, '[]', '[]', 1800000000000, 0,
                'user-schema', 'user-schema'
             )",
        ),
    ];

    let mut accepted_tables = Vec::new();
    for (table_name, sql) in invalid_version_inserts {
        if sqlx::query(sql).execute(&pool).await.is_ok() {
            accepted_tables.push(table_name);
        }
    }

    assert!(
        accepted_tables.is_empty(),
        "schema must reject non-positive version values for: {accepted_tables:?}"
    );
}

#[tokio::test]
async fn sqlite_schema_rejects_invalid_fixed_dictionary_values() {
    let pool = create_sqlite_schema().await;
    seed_space(&pool, "space-enum").await;
    seed_provider(&pool, "provider-enum").await;
    insert_node(
        &pool,
        "node-enum",
        "space-enum",
        None,
        "file",
        "enum.txt",
        "active",
    )
    .await
    .expect("valid node should be inserted");

    assert!(
        insert_node(
            &pool,
            "node-invalid-type",
            "space-enum",
            None,
            "mystery",
            "bad-type.txt",
            "active",
        )
        .await
        .is_err(),
        "dr_drive_node.node_type must be constrained to supported node kinds"
    );
    assert!(
        insert_node(
            &pool,
            "node-invalid-status",
            "space-enum",
            None,
            "file",
            "bad-status.txt",
            "archived",
        )
        .await
        .is_err(),
        "dr_drive_node.lifecycle_status must be constrained to active, trashed, deleted"
    );

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_upload_session (
                id, tenant_id, space_id, node_id, bucket, object_key,
                idempotency_key, storage_provider_id, storage_upload_id, state,
                expires_at_epoch_ms, version, created_by, updated_by
             ) VALUES (
                'upload-invalid-state', 'tenant-schema', 'space-enum', 'node-enum',
                'bucket-enum', 'object-enum', 'idem-enum', 'provider-enum',
                'storage-upload-enum', 'paused', 1800000000000, 1, 'user-schema', 'user-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "dr_drive_upload_session.state must be constrained to the upload state machine values"
    );

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, status,
                version, created_by, updated_by
             ) VALUES (
                'provider-invalid-kind', 'ftp', 'Invalid Provider',
                'https://storage.example.com', 'bucket-invalid-kind', 1,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "dr_drive_storage_provider.provider_kind must be constrained to supported providers or custom:*"
    );
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, status,
            version, created_by, updated_by
         ) VALUES (
            'provider-custom-kind', 'custom:minio', 'Custom Provider',
            'https://storage.example.com', 'bucket-custom-kind', 1,
            'active', 1, 'admin-schema', 'admin-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept custom storage provider kind values");

    for (provider_kind, provider_id, endpoint_url) in [
        (
            "tencent_cos",
            "provider-tencent-cos-kind",
            "https://cos.ap-guangzhou.myqcloud.com",
        ),
        (
            "huawei_obs",
            "provider-huawei-obs-kind",
            "https://obs.cn-north-4.myhuaweicloud.com",
        ),
        (
            "volcengine_tos",
            "provider-volcengine-tos-kind",
            "https://tos-cn-beijing.volces.com",
        ),
    ] {
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, status,
                version, created_by, updated_by
             ) VALUES (
                ?1, ?2, ?1, ?3, ?1, 0,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .bind(provider_id)
        .bind(provider_kind)
        .bind(endpoint_url)
        .execute(&pool)
        .await
        .expect("schema should accept explicit S3 cloud storage provider kind values");
    }

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, status,
                version, created_by, updated_by
             ) VALUES (
                'provider-invalid-endpoint', 's3_compatible', 'Invalid Endpoint',
                'ftp://storage.example.com', 'bucket-invalid-endpoint', 1,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "dr_drive_storage_provider.endpoint_url must be constrained to http(s) endpoints"
    );

    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, status,
            version, created_by, updated_by
         ) VALUES (
            'provider-local-file-endpoint', 'local_filesystem', 'Local Provider',
            'file:///tmp/sdkwork-drive', 'bucket-local-file-endpoint', 1,
            'active', 1, 'admin-schema', 'admin-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("schema should accept file endpoints for local filesystem storage providers");

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_storage_provider (
                id, provider_kind, name, endpoint_url, bucket, path_style, status,
                version, created_by, updated_by
             ) VALUES (
                'provider-invalid-bucket', 's3_compatible', 'Invalid Bucket',
                'https://storage.example.com', 'bucket with spaces', 1,
                'active', 1, 'admin-schema', 'admin-schema'
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "dr_drive_storage_provider.bucket must reject path-like or whitespace-containing names"
    );

    for (index, bucket) in [
        "ab",
        "Drive-Bucket",
        "drive_bucket",
        "drive..bucket",
        "drive-bucket-",
        "-drive-bucket",
        "192.168.5.4",
    ]
    .into_iter()
    .enumerate()
    {
        assert!(
            sqlx::query(
                "INSERT INTO dr_drive_storage_provider (
                    id, provider_kind, name, endpoint_url, bucket, path_style, status,
                    version, created_by, updated_by
                 ) VALUES (
                    ?1, 's3_compatible', 'Invalid DNS Bucket',
                    'https://storage.example.com', ?2, 1,
                    'active', 1, 'admin-schema', 'admin-schema'
                 )",
            )
            .bind(format!("provider-invalid-dns-bucket-{index}"))
            .bind(bucket)
            .execute(&pool)
            .await
            .is_err(),
            "dr_drive_storage_provider.bucket must enforce DNS-compatible bucket names for object stores: {bucket}"
        );
    }

    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, status,
            version, created_by, updated_by
         ) VALUES (
            'provider-local-dir-bucket', 'local_filesystem', 'Local Dir Bucket',
            'file:///tmp/sdkwork-drive-local-dir', 'Drive_Bucket', 1,
            'active', 1, 'admin-schema', 'admin-schema'
         )",
    )
    .execute(&pool)
    .await
    .expect("local filesystem bucket should accept relative directory style bucket values");

    assert!(
        insert_storage_binding(
            &pool,
            "binding-invalid-scope",
            Some("space-enum"),
            "provider-enum",
            "folder",
            "active",
        )
        .await
        .is_err(),
        "dr_drive_storage_provider_binding.binding_scope must be tenant, space, or space_type"
    );

    assert!(
        sqlx::query(
            "INSERT INTO dr_drive_maintenance_job (
                id, job_type, status, dry_run, scanned_count, affected_count,
                operator_id, started_at, finished_at
             ) VALUES (
                9105, 'unknown_job', 'completed', 0, 0, 0, 'admin-schema',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
             )",
        )
        .execute(&pool)
        .await
        .is_err(),
        "dr_drive_maintenance_job.job_type must be constrained to known maintenance jobs"
    );
}

async fn create_sqlite_schema() -> AnyPool {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");

    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema installation should succeed");
    pool
}

async fn seed_space(pool: &AnyPool, space_id: &str) {
    sqlx::query(
        "INSERT INTO dr_drive_space (
            id, tenant_id, owner_subject_type, owner_subject_id, space_type, display_name,
            lifecycle_status, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', 'user', 'user-schema', 'personal', 'Schema',
            'active', 1, 'user-schema', 'user-schema')",
    )
    .bind(space_id)
    .execute(pool)
    .await
    .expect("seed space should succeed");
}

async fn seed_provider(pool: &AnyPool, provider_id: &str) {
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider (
            id, provider_kind, name, endpoint_url, bucket, path_style, status,
            version, created_by, updated_by
         ) VALUES (?1, 's3_compatible', ?1, 'https://s3.example.com', ?1, 1, 'active',
            1, 'admin-schema', 'admin-schema')",
    )
    .bind(provider_id)
    .execute(pool)
    .await
    .expect("seed storage provider should succeed");
}

async fn insert_storage_binding(
    pool: &AnyPool,
    binding_id: &str,
    space_id: Option<&str>,
    provider_id: &str,
    binding_scope: &str,
    lifecycle_status: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider_binding (
            id, tenant_id, space_id, provider_id, binding_scope, purpose,
            storage_root_prefix, lifecycle_status, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, ?3, ?4, 'primary', ?5, ?6, 1,
            'admin-schema', 'admin-schema')",
    )
    .bind(binding_id)
    .bind(space_id)
    .bind(provider_id)
    .bind(binding_scope)
    .bind(match space_id {
        Some(space_id) => format!("sdkwork-drive/v1/tenants/tenant-schema/spaces/{space_id}"),
        None => "sdkwork-drive/v1/tenants/tenant-schema".to_string(),
    })
    .bind(lifecycle_status)
    .execute(pool)
    .await
}

async fn insert_node(
    pool: &AnyPool,
    node_id: &str,
    space_id: &str,
    parent_node_id: Option<&str>,
    node_type: &str,
    node_name: &str,
    lifecycle_status: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, space_type, parent_node_id, node_type, node_name,
            content_state, lifecycle_status, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, 'personal', ?3, ?4, ?5, 'empty', ?6, 1,
            'user-schema', 'user-schema')",
    )
    .bind(node_id)
    .bind(space_id)
    .bind(parent_node_id)
    .bind(node_type)
    .bind(node_name)
    .bind(lifecycle_status)
    .execute(pool)
    .await
}

async fn insert_permission(
    pool: &AnyPool,
    permission_id: &str,
    node_id: &str,
    subject_type: &str,
    subject_id: &str,
    role: &str,
    lifecycle_status: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_node_permission (
            id, tenant_id, node_id, subject_type, subject_id, role,
            inherited, lifecycle_status, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, ?3, ?4, ?5, 0, ?6, 1,
            'user-schema', 'user-schema')",
    )
    .bind(permission_id)
    .bind(node_id)
    .bind(subject_type)
    .bind(subject_id)
    .bind(role)
    .bind(lifecycle_status)
    .execute(pool)
    .await
}

async fn insert_share_link(
    pool: &AnyPool,
    share_link_id: &str,
    node_id: &str,
    download_limit: i64,
    download_count: i64,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_node_share_link (
            id, tenant_id, node_id, token_hash, role, expires_at_epoch_ms,
            download_limit, download_count, lifecycle_status, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, ?3, 'reader', NULL, ?4, ?5, 'active', 1,
            'user-schema', 'user-schema')",
    )
    .bind(share_link_id)
    .bind(node_id)
    .bind(format!("sha256:{share_link_id}"))
    .bind(download_limit)
    .bind(download_count)
    .execute(pool)
    .await
}

async fn insert_storage_object(
    pool: &AnyPool,
    object_id: &str,
    node_id: &str,
    version_no: i64,
    content_length: i64,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, ?3, 'provider-schema', 'bucket-schema',
            ?4, 'text/plain', ?5, ?6, 'active', 'user-schema', 'user-schema')",
    )
    .bind(object_id)
    .bind(node_id)
    .bind(version_no)
    .bind(format!("objects/{object_id}.txt"))
    .bind(content_length)
    .bind(valid_storage_checksum())
    .execute(pool)
    .await
}

async fn insert_storage_object_with_key(
    pool: &AnyPool,
    object_id: &str,
    node_id: &str,
    object_key: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, 1, 'provider-schema', 'bucket-schema',
            ?3, 'text/plain', 1, ?4, 'active', 'user-schema', 'user-schema')",
    )
    .bind(object_id)
    .bind(node_id)
    .bind(object_key)
    .bind(valid_storage_checksum())
    .execute(pool)
    .await
}

async fn insert_storage_object_with_key_and_version(
    pool: &AnyPool,
    object_id: &str,
    node_id: &str,
    object_key: &str,
    version_no: i64,
    lifecycle_status: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, ?3, 'provider-schema', 'bucket-schema',
            ?4, 'text/plain', 1, ?5, ?6, 'user-schema', 'user-schema')",
    )
    .bind(object_id)
    .bind(node_id)
    .bind(version_no)
    .bind(object_key)
    .bind(valid_storage_checksum())
    .bind(lifecycle_status)
    .execute(pool)
    .await
}

async fn insert_storage_object_with_metadata(
    pool: &AnyPool,
    object_id: &str,
    node_id: &str,
    content_type: &str,
    checksum_sha256_hex: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, 1, 'provider-schema', 'bucket-schema',
            ?3, ?4, 1, ?5, 'active', 'user-schema', 'user-schema')",
    )
    .bind(object_id)
    .bind(node_id)
    .bind(format!("objects/{object_id}.txt"))
    .bind(content_type)
    .bind(checksum_sha256_hex)
    .execute(pool)
    .await
}

async fn insert_storage_object_with_bucket(
    pool: &AnyPool,
    object_id: &str,
    node_id: &str,
    bucket: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_storage_object (
            id, tenant_id, node_id, version_no, storage_provider_id, bucket, object_key,
            content_type, content_length, checksum_sha256_hex, lifecycle_status,
            created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?2, 1, 'provider-schema', ?3, ?4,
            'text/plain', 1, ?5, 'active', 'user-schema', 'user-schema')",
    )
    .bind(object_id)
    .bind(node_id)
    .bind(bucket)
    .bind(format!("objects/{object_id}.txt"))
    .bind(valid_storage_checksum())
    .execute(pool)
    .await
}

fn valid_storage_checksum() -> &'static str {
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}

async fn insert_upload_session_with_key(
    pool: &AnyPool,
    upload_id: &str,
    space_id: &str,
    node_id: &str,
    object_key: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_upload_session (
            id, tenant_id, space_id, node_id, bucket, object_key,
            idempotency_key, storage_provider_id, storage_upload_id, state,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (
            ?1, 'tenant-schema', ?2, ?3, 'bucket-schema', ?4,
            ?5, 'provider-upload-key-values', ?6, 'created',
            1800000000000, 1, 'user-schema', 'user-schema'
         )",
    )
    .bind(upload_id)
    .bind(space_id)
    .bind(node_id)
    .bind(object_key)
    .bind(format!("idem-{upload_id}"))
    .bind(format!("storage-upload-{upload_id}"))
    .execute(pool)
    .await
}

async fn insert_upload_session_with_bucket(
    pool: &AnyPool,
    upload_id: &str,
    space_id: &str,
    node_id: &str,
    bucket: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_upload_session (
            id, tenant_id, space_id, node_id, bucket, object_key,
            idempotency_key, storage_provider_id, storage_upload_id, state,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (
            ?1, 'tenant-schema', ?2, ?3, ?4, ?5,
            ?6, 'provider-runtime-bucket-values', ?7, 'created',
            1800000000000, 1, 'user-schema', 'user-schema'
         )",
    )
    .bind(upload_id)
    .bind(space_id)
    .bind(node_id)
    .bind(bucket)
    .bind(format!("objects/{upload_id}.txt"))
    .bind(format!("idem-{upload_id}"))
    .bind(format!("storage-upload-{upload_id}"))
    .execute(pool)
    .await
}

async fn insert_download_package(
    pool: &AnyPool,
    package_id: &str,
    provider_id: &str,
    file_count: i64,
    total_bytes: i64,
    archive_size_bytes: i64,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    insert_download_package_with_expiration(
        pool,
        package_id,
        provider_id,
        file_count,
        total_bytes,
        archive_size_bytes,
        1_800_000_000_000,
    )
    .await
}

async fn insert_download_package_with_expiration(
    pool: &AnyPool,
    package_id: &str,
    provider_id: &str,
    file_count: i64,
    total_bytes: i64,
    archive_size_bytes: i64,
    expires_at_epoch_ms: i64,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_download_package (
            id, tenant_id, package_name, state, storage_provider_id, bucket,
            archive_object_key, content_type, file_count, total_bytes,
            archive_size_bytes, requested_node_ids_json, item_manifest_json,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?1, 'ready', ?2, 'bucket-schema',
            ?3, 'application/zip', ?4, ?5, ?6, '[]', '[]',
            ?7, 1, 'user-schema', 'user-schema')",
    )
    .bind(package_id)
    .bind(provider_id)
    .bind(format!("archives/{package_id}.zip"))
    .bind(file_count)
    .bind(total_bytes)
    .bind(archive_size_bytes)
    .bind(expires_at_epoch_ms)
    .execute(pool)
    .await
}

async fn insert_download_package_with_bucket(
    pool: &AnyPool,
    package_id: &str,
    provider_id: &str,
    bucket: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_download_package (
            id, tenant_id, package_name, state, storage_provider_id, bucket,
            archive_object_key, content_type, file_count, total_bytes,
            archive_size_bytes, requested_node_ids_json, item_manifest_json,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?1, 'ready', ?2, ?3,
            ?4, 'application/zip', 1, 1, 1, '[]', '[]',
            1800000000000, 1, 'user-schema', 'user-schema')",
    )
    .bind(package_id)
    .bind(provider_id)
    .bind(bucket)
    .bind(format!("archives/{package_id}.zip"))
    .execute(pool)
    .await
}

async fn insert_download_package_with_key(
    pool: &AnyPool,
    package_id: &str,
    provider_id: &str,
    archive_object_key: &str,
) -> Result<sqlx::any::AnyQueryResult, sqlx::Error> {
    sqlx::query(
        "INSERT INTO dr_drive_download_package (
            id, tenant_id, package_name, state, storage_provider_id, bucket,
            archive_object_key, content_type, file_count, total_bytes,
            archive_size_bytes, requested_node_ids_json, item_manifest_json,
            expires_at_epoch_ms, version, created_by, updated_by
         ) VALUES (?1, 'tenant-schema', ?1, 'ready', ?2, 'bucket-schema',
            ?3, 'application/zip', 1, 1, 1, '[]', '[]',
            1800000000000, 1, 'user-schema', 'user-schema')",
    )
    .bind(package_id)
    .bind(provider_id)
    .bind(archive_object_key)
    .execute(pool)
    .await
}

#[tokio::test]
async fn sqlite_installer_upgrades_legacy_dr_drive_node_head_columns() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");

    sqlx::query(
        "CREATE TABLE dr_drive_space (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            owner_subject_type TEXT NOT NULL,
            owner_subject_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            space_type TEXT NOT NULL,
            lifecycle_status TEXT NOT NULL DEFAULT 'active',
            version INTEGER NOT NULL DEFAULT 1,
            created_by TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await
    .expect("legacy dr_drive_space table should be created");

    sqlx::query(
        "CREATE TABLE dr_drive_node (
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
            lifecycle_status TEXT NOT NULL DEFAULT 'active',
            version INTEGER NOT NULL DEFAULT 1,
            created_by TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(&pool)
    .await
    .expect("legacy dr_drive_node table should be created");

    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema upgrade should succeed");

    for column_name in [
        "content_state",
        "file_extension",
        "head_content_type",
        "head_content_type_group",
        "head_content_length",
        "head_version_no",
        "head_checksum_sha256_hex",
    ] {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(1) FROM pragma_table_info('dr_drive_node') WHERE name = ?1",
        )
        .bind(column_name)
        .fetch_one(&pool)
        .await
        .expect("sqlite dr_drive_node column lookup should succeed");
        assert_eq!(
            count, 1,
            "legacy dr_drive_node should be upgraded with column: {column_name}"
        );
    }
}
