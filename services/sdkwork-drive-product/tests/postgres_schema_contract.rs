use sqlx::postgres::PgPoolOptions;

#[tokio::test]
async fn postgres_installer_uses_drive_nodes_for_global_assets() {
    let database_url = match std::env::var("SDKWORK_DRIVE_POSTGRES_URL") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!(
                "skip postgres global assets contract: SDKWORK_DRIVE_POSTGRES_URL is not set"
            );
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("postgres pool should be created");

    sdkwork_drive_product::infrastructure::sql::install_postgres_schema(&pool)
        .await
        .expect("postgres schema installation should succeed");

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
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name=$1
            )",
        )
        .bind(table_name)
        .fetch_one(&pool)
        .await
        .expect("postgres asset table lookup should succeed");
        assert!(
            !exists,
            "global assets must not duplicate Drive nodes with table: {table_name}"
        );
    }

    for index_name in [
        "ix_dr_drive_node_asset_list",
        "ix_dr_drive_node_asset_scene_source",
        "ix_dr_drive_storage_object_node_latest",
        "ix_dr_drive_node_version_node_latest",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname='public' AND indexname=$1
            )",
        )
        .bind(index_name)
        .fetch_one(&pool)
        .await
        .expect("postgres asset index lookup should succeed");
        assert!(
            exists,
            "expected Drive-backed asset index exists: {index_name}"
        );
    }
}

#[tokio::test]
async fn postgres_installer_creates_special_space_profile_tables() {
    let database_url = match std::env::var("SDKWORK_DRIVE_POSTGRES_URL") {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            eprintln!("skip postgres schema contract: SDKWORK_DRIVE_POSTGRES_URL is not set");
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("postgres pool should be created");

    sdkwork_drive_product::infrastructure::sql::install_postgres_schema(&pool)
        .await
        .expect("postgres schema installation should succeed");

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
        "dr_drive_storage_provider",
        "dr_drive_storage_provider_binding",
        "dr_drive_audit_event",
        "dr_drive_maintenance_job",
        "dr_drive_node_version",
        "dr_drive_space_version_policy",
        "dr_drive_node_version_policy",
        "dr_drive_upload_item",
        "dr_drive_upload_part",
        "dr_drive_file_sensitive_operation",
    ] {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name=$1
            )",
        )
        .bind(table_name)
        .fetch_one(&pool)
        .await
        .expect("postgres table lookup should succeed");
        assert!(exists, "expected table exists: {table_name}");
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
        "ux_dr_drive_change_cursor_scope",
        "ux_dr_drive_change_log_space_sequence",
        "ix_dr_drive_change_log_tenant_space_created",
        "ix_dr_drive_audit_event_tenant_created",
        "ix_dr_drive_audit_event_resource",
        "ix_dr_drive_audit_event_action_created",
        "ix_dr_drive_audit_event_request_created",
        "ix_dr_drive_audit_event_trace_created",
        "ix_dr_drive_storage_provider_binding_lookup",
        "ix_dr_drive_storage_provider_binding_provider",
        "ux_dr_drive_storage_provider_binding_tenant_primary_active",
        "ux_dr_drive_storage_provider_binding_space_primary_active",
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
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname='public' AND indexname=$1
            )",
        )
        .bind(index_name)
        .fetch_one(&pool)
        .await
        .expect("postgres index lookup should succeed");
        assert!(exists, "expected index exists: {index_name}");
    }

    let shortcut_target_column_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema='public'
              AND table_name='dr_drive_node'
              AND column_name='shortcut_target_node_id'
        )",
    )
    .fetch_one(&pool)
    .await
    .expect("postgres dr_drive_node column lookup should succeed");
    assert!(
        shortcut_target_column_exists,
        "dr_drive_node should expose shortcut_target_node_id"
    );

    for column_name in ["scene", "source"] {
        let column_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema='public'
                  AND table_name='dr_drive_upload_item'
                  AND column_name=$1
            )",
        )
        .bind(column_name)
        .fetch_one(&pool)
        .await
        .expect("postgres dr_drive_upload_item column lookup should succeed");
        assert!(
            column_exists,
            "dr_drive_upload_item should expose {column_name}"
        );
    }

    for table_name in ["dr_drive_node", "dr_drive_storage_object"] {
        for column_name in ["scene", "source"] {
            let column_exists: bool = sqlx::query_scalar(
                "SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema='public'
                      AND table_name=$1
                      AND column_name=$2
                )",
            )
            .bind(table_name)
            .bind(column_name)
            .fetch_one(&pool)
            .await
            .expect("postgres usage context column lookup should succeed");
            assert!(column_exists, "{table_name} should expose {column_name}");
        }
    }
}
