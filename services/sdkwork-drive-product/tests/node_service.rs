use sdkwork_drive_product::application::node_service::{CreateNodeCommand, DriveNodeService};
use sdkwork_drive_product::application::space_service::{CreateSpaceCommand, DriveSpaceService};
use sdkwork_drive_product::domain::node::DriveNodeType;
use sdkwork_drive_product::domain::space::DriveSpaceType;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::node_store::SqlNodeStore;
use sdkwork_drive_product::infrastructure::sql::space_store::SqlSpaceStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn create_folder_enforces_live_name_uniqueness_per_parent() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let space_store = SqlSpaceStore::new(pool.clone());
    let node_store = SqlNodeStore::new(pool.clone());
    let space_service = DriveSpaceService::new(space_store);
    let node_service = DriveNodeService::new(node_store);

    let space = space_service
        .create_space(CreateSpaceCommand {
            id: "space-main".to_string(),
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: "user".to_string(),
            owner_subject_id: "user-001".to_string(),
            display_name: "Main".to_string(),
            space_type: DriveSpaceType::Personal,
            operator_id: "user-001".to_string(),
        })
        .await
        .expect("space should be created");

    node_service
        .create_node(CreateNodeCommand {
            id: "node-001".to_string(),
            tenant_id: "tenant-001".to_string(),
            space_id: space.id.clone(),
            parent_node_id: None,
            node_type: DriveNodeType::Folder,
            node_name: "docs".to_string(),
            operator_id: "user-001".to_string(),
        })
        .await
        .expect("first folder should be created");

    let duplicate = node_service
        .create_node(CreateNodeCommand {
            id: "node-002".to_string(),
            tenant_id: "tenant-001".to_string(),
            space_id: space.id,
            parent_node_id: None,
            node_type: DriveNodeType::Folder,
            node_name: "docs".to_string(),
            operator_id: "user-001".to_string(),
        })
        .await;

    let error = duplicate.expect_err("duplicate folder name must be rejected");
    let message = format!("{error:?}");
    assert!(message.contains("already exists"));
}
