use sdkwork_drive_config::DatabaseEngine;
use sdkwork_drive_contract::drive::domain_events as drive_events;
use sdkwork_drive_workspace_service::application::change_feed_service::{
    ListChangesCommand, QueryStartPageTokenCommand, SqlDriveChangeFeedService,
};
use sdkwork_drive_workspace_service::application::space_lifecycle_service::{
    BootstrapTeamSpaceCreatorAccessCommand, RetireSpaceContentsCommand,
    SqlDriveSpaceLifecycleService,
};
use sdkwork_drive_workspace_service::application::space_service::{
    CreateSpaceCommand, DriveSpaceService,
};
use sdkwork_drive_workspace_service::domain::space::DriveSpaceType;
use sdkwork_drive_workspace_service::infrastructure::change_recorder::{
    record_drive_change, RecordDriveChangeCommand,
};
use sdkwork_drive_workspace_service::infrastructure::sql::install_any_schema;
use sdkwork_drive_workspace_service::infrastructure::sql::space_store::SqlSpaceStore;
use sqlx::any::AnyPoolOptions;

#[tokio::test]
async fn space_lifecycle_service_bootstraps_team_space_root_and_owner_permission() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");

    let space_service = DriveSpaceService::new(SqlSpaceStore::new(pool.clone()));
    let space = space_service
        .create_space(CreateSpaceCommand {
            id: "team-space-1".to_string(),
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: "group".to_string(),
            owner_subject_id: "org-1:team-a".to_string(),
            display_name: "Engineering".to_string(),
            space_type: DriveSpaceType::Team,
            presentation_icon: None,
            presentation_color: None,
            description: None,
            operator_id: "user-creator".to_string(),
        })
        .await
        .expect("team space should be created");

    SqlDriveSpaceLifecycleService::new(pool.clone())
        .bootstrap_team_space_creator_access(BootstrapTeamSpaceCreatorAccessCommand {
            tenant_id: space.tenant_id.clone(),
            space_id: space.id.clone(),
            creator_user_id: "user-creator".to_string(),
            display_name: space.display_name.clone(),
            root_folder_id: "folder_root_1".to_string(),
        })
        .await
        .expect("team space bootstrap should succeed");

    let permission_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_node_permission
         WHERE tenant_id='tenant-001'
           AND subject_type='user'
           AND subject_id='user-creator'
           AND role='owner'
           AND lifecycle_status='active'",
    )
    .fetch_one(&pool)
    .await
    .expect("permission count should be readable");
    assert_eq!(permission_count, 1);
}

#[tokio::test]
async fn space_lifecycle_service_retires_space_contents_before_space_delete_side_effects() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");

    let space_service = DriveSpaceService::new(SqlSpaceStore::new(pool.clone()));
    let space = space_service
        .create_space(CreateSpaceCommand {
            id: "space-retire".to_string(),
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: "user".to_string(),
            owner_subject_id: "user-001".to_string(),
            display_name: "Personal".to_string(),
            space_type: DriveSpaceType::Personal,
            presentation_icon: None,
            presentation_color: None,
            description: None,
            operator_id: "user-001".to_string(),
        })
        .await
        .expect("space should be created");

    sqlx::query(
        "INSERT INTO dr_drive_node (
            id, tenant_id, space_id, node_type, node_name, content_state, lifecycle_status,
            version, created_by, updated_by
         ) VALUES ('node-1', 'tenant-001', 'space-retire', 'folder', 'Docs', 'ready', 'active', 1, 'user-001', 'user-001')",
    )
    .execute(&pool)
    .await
    .expect("node insert should succeed");

    let deleted_count = SqlDriveSpaceLifecycleService::new(pool.clone())
        .retire_space_contents(RetireSpaceContentsCommand {
            tenant_id: space.tenant_id,
            space_id: space.id,
            operator_id: "user-001".to_string(),
        })
        .await
        .expect("space contents should be retired");
    assert_eq!(deleted_count, 1);

    let active_nodes: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM dr_drive_node WHERE space_id='space-retire' AND lifecycle_status != 'deleted'",
    )
    .fetch_one(&pool)
    .await
    .expect("active node count should be readable");
    assert_eq!(active_nodes, 0);
}

#[tokio::test]
async fn change_feed_service_lists_changes_and_start_page_token() {
    sqlx::any::install_default_drivers();
    let pool = AnyPoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_any_schema(&pool, DatabaseEngine::Sqlite)
        .await
        .expect("sqlite schema should be installed");

    record_drive_change(
        &pool,
        RecordDriveChangeCommand {
            tenant_id: "tenant-001",
            space_id: "space-1",
            node_id: Some("node-1"),
            event_type: drive_events::node::CREATED,
            actor_id: "user-001",
        },
    )
    .await
    .expect("first change should be recorded");
    record_drive_change(
        &pool,
        RecordDriveChangeCommand {
            tenant_id: "tenant-001",
            space_id: "space-1",
            node_id: Some("node-2"),
            event_type: drive_events::node::UPDATED,
            actor_id: "user-001",
        },
    )
    .await
    .expect("second change should be recorded");

    let service = SqlDriveChangeFeedService::new(pool.clone());
    let start_token = service
        .query_start_page_token(QueryStartPageTokenCommand {
            tenant_id: "tenant-001".to_string(),
            space_id: Some("space-1".to_string()),
        })
        .await
        .expect("start page token should be computed");
    assert_eq!(start_token, 2);

    let changes = service
        .list_changes(ListChangesCommand {
            tenant_id: "tenant-001".to_string(),
            space_id: "space-1".to_string(),
            after_sequence: 0,
            limit: 10,
            subject_type: None,
            subject_id: None,
            is_space_owner: true,
        })
        .await
        .expect("changes should be listed");
    assert_eq!(changes.len(), 2);
    assert_eq!(changes[0].sequence_no, 1);
    assert_eq!(changes[1].event_type, drive_events::node::UPDATED);
}
