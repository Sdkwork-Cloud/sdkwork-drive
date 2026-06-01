use sdkwork_drive_product::application::space_service::{
    CreateSpaceCommand, DriveSpaceService, ListSpacesCommand,
};
use sdkwork_drive_product::domain::space::DriveSpaceType;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::space_store::SqlSpaceStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn create_space_supports_knowledge_ai_upload_types() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let store = SqlSpaceStore::new(pool.clone());
    let service = DriveSpaceService::new(store);

    for (index, space_type) in [
        DriveSpaceType::KnowledgeBase,
        DriveSpaceType::AiGenerated,
        DriveSpaceType::AppUpload,
    ]
    .into_iter()
    .enumerate()
    {
        let created = service
            .create_space(CreateSpaceCommand {
                id: format!("space-{index}"),
                tenant_id: "tenant-001".to_string(),
                owner_subject_type: "user".to_string(),
                owner_subject_id: "user-001".to_string(),
                display_name: format!("space-{index}"),
                space_type: space_type.clone(),
                operator_id: "user-001".to_string(),
            })
            .await
            .expect("space creation should succeed");
        assert_eq!(created.space_type, space_type);
    }
}

#[tokio::test]
async fn list_spaces_supports_tenant_and_owner_filters() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let store = SqlSpaceStore::new(pool);
    let service = DriveSpaceService::new(store);

    service
        .create_space(CreateSpaceCommand {
            id: "space-001".to_string(),
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: "user".to_string(),
            owner_subject_id: "user-001".to_string(),
            display_name: "main".to_string(),
            space_type: DriveSpaceType::Personal,
            operator_id: "user-001".to_string(),
        })
        .await
        .expect("first space should be created");
    service
        .create_space(CreateSpaceCommand {
            id: "space-002".to_string(),
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: "user".to_string(),
            owner_subject_id: "user-002".to_string(),
            display_name: "kb".to_string(),
            space_type: DriveSpaceType::KnowledgeBase,
            operator_id: "user-002".to_string(),
        })
        .await
        .expect("second space should be created");
    service
        .create_space(CreateSpaceCommand {
            id: "space-003".to_string(),
            tenant_id: "tenant-002".to_string(),
            owner_subject_type: "user".to_string(),
            owner_subject_id: "user-003".to_string(),
            display_name: "other".to_string(),
            space_type: DriveSpaceType::Team,
            operator_id: "user-003".to_string(),
        })
        .await
        .expect("third space should be created");

    let tenant_spaces = service
        .list_spaces(ListSpacesCommand {
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: None,
            owner_subject_id: None,
        })
        .await
        .expect("tenant space list should succeed");
    assert_eq!(tenant_spaces.len(), 2);

    let owner_spaces = service
        .list_spaces(ListSpacesCommand {
            tenant_id: "tenant-001".to_string(),
            owner_subject_type: Some("user".to_string()),
            owner_subject_id: Some("user-002".to_string()),
        })
        .await
        .expect("owner space list should succeed");
    assert_eq!(owner_spaces.len(), 1);
    assert_eq!(owner_spaces[0].id, "space-002");
}
