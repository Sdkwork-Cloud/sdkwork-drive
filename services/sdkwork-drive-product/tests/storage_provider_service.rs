use sdkwork_drive_product::application::storage_provider_service::{
    CreateStorageProviderCommand, DeleteStorageProviderCommand, DriveStorageProviderService,
    ListStorageProvidersCommand, TestStorageProviderCommand, UpdateStorageProviderCommand,
};
use sdkwork_drive_product::domain::storage_provider::DriveStorageProviderKind;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn create_and_list_storage_providers_with_status_filter() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveStorageProviderService::new(SqlStorageProviderStore::new(pool));

    service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-001".to_string(),
            provider_kind: DriveStorageProviderKind::S3Compatible,
            name: "Provider 001".to_string(),
            endpoint_url: "https://s3.example.com".to_string(),
            region: Some("us-east-1".to_string()),
            bucket: "drive-bucket".to_string(),
            path_style: Some(true),
            credential_ref: None,
            server_side_encryption_mode: Some("AES256".to_string()),
            default_storage_class: Some("STANDARD".to_string()),
            status: Some("active".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("active provider should be created");
    service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-002".to_string(),
            provider_kind: DriveStorageProviderKind::S3Compatible,
            name: "Provider 002".to_string(),
            endpoint_url: "https://s3-alt.example.com".to_string(),
            region: Some("us-east-1".to_string()),
            bucket: "drive-bucket-alt".to_string(),
            path_style: Some(true),
            credential_ref: None,
            server_side_encryption_mode: None,
            default_storage_class: Some("STANDARD_IA".to_string()),
            status: Some("disabled".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("disabled provider should be created");

    let all_items = service
        .list_storage_providers(ListStorageProvidersCommand { status: None })
        .await
        .expect("list all providers should succeed");
    assert_eq!(all_items.len(), 2);

    let active_items = service
        .list_storage_providers(ListStorageProvidersCommand {
            status: Some("active".to_string()),
        })
        .await
        .expect("list active providers should succeed");
    assert_eq!(active_items.len(), 1);
    assert_eq!(active_items[0].id, "provider-001");
}

#[tokio::test]
async fn update_test_and_delete_storage_provider_flow() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveStorageProviderService::new(SqlStorageProviderStore::new(pool));
    service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-001".to_string(),
            provider_kind: DriveStorageProviderKind::S3Compatible,
            name: "Provider 001".to_string(),
            endpoint_url: "https://s3.example.com".to_string(),
            region: Some("us-east-1".to_string()),
            bucket: "drive-bucket".to_string(),
            path_style: Some(true),
            credential_ref: None,
            server_side_encryption_mode: None,
            default_storage_class: None,
            status: Some("active".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("provider should be created");

    let updated = service
        .update_storage_provider(UpdateStorageProviderCommand {
            provider_id: "provider-001".to_string(),
            name: Some("Provider 001 Updated".to_string()),
            endpoint_url: Some("https://s3-updated.example.com".to_string()),
            region: Some("us-west-2".to_string()),
            bucket: Some("drive-bucket-updated".to_string()),
            path_style: Some(false),
            credential_ref: None,
            server_side_encryption_mode: Some("aws:kms".to_string()),
            default_storage_class: Some("INTELLIGENT_TIERING".to_string()),
            status: Some("disabled".to_string()),
            operator_id: "admin-002".to_string(),
        })
        .await
        .expect("provider should be updated");
    assert_eq!(updated.status, "disabled");
    assert_eq!(updated.endpoint_url, "https://s3-updated.example.com");
    assert_eq!(updated.name, "Provider 001 Updated");
    assert_eq!(updated.region.as_deref(), Some("us-west-2"));
    assert!(!updated.path_style);
    assert_eq!(
        updated.server_side_encryption_mode.as_deref(),
        Some("aws:kms")
    );
    assert_eq!(
        updated.default_storage_class.as_deref(),
        Some("INTELLIGENT_TIERING")
    );

    let tested = service
        .test_storage_provider(TestStorageProviderCommand {
            provider_id: "provider-001".to_string(),
        })
        .await
        .expect("provider should be testable");
    assert!(tested.reachable);

    let deleted = service
        .delete_storage_provider(DeleteStorageProviderCommand {
            provider_id: "provider-001".to_string(),
            operator_id: "admin-003".to_string(),
        })
        .await
        .expect("provider should be deleted");
    assert!(deleted.deleted);

    let all_items = service
        .list_storage_providers(ListStorageProvidersCommand { status: None })
        .await
        .expect("list should succeed");
    assert!(all_items.is_empty());
}

#[tokio::test]
async fn create_storage_provider_supports_custom_provider_kind_prefix() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveStorageProviderService::new(SqlStorageProviderStore::new(pool));
    let created = service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-custom-001".to_string(),
            provider_kind: DriveStorageProviderKind::Custom("custom:vendor_x".to_string()),
            name: "Vendor X".to_string(),
            endpoint_url: "https://custom.example.com".to_string(),
            region: Some("cn-hangzhou".to_string()),
            bucket: "custom-bucket".to_string(),
            path_style: Some(true),
            credential_ref: None,
            server_side_encryption_mode: None,
            default_storage_class: Some("STANDARD".to_string()),
            status: Some("active".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("custom provider kind should be accepted");

    assert_eq!(created.provider_kind.as_str(), "custom:vendor_x");
    assert_eq!(created.name, "Vendor X");
    assert_eq!(created.region.as_deref(), Some("cn-hangzhou"));
    assert!(created.path_style);
}

#[tokio::test]
async fn create_storage_provider_applies_provider_default_path_style_when_not_provided() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(":memory:")
        .await
        .expect("sqlite in-memory pool should be created");
    install_sqlite_schema(&pool)
        .await
        .expect("sqlite schema should be installed");

    let service = DriveStorageProviderService::new(SqlStorageProviderStore::new(pool));
    let created_oss = service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-oss-001".to_string(),
            provider_kind: DriveStorageProviderKind::AliyunOss,
            name: "Aliyun OSS".to_string(),
            endpoint_url: "https://oss-cn-hangzhou.aliyuncs.com".to_string(),
            region: Some("cn-hangzhou".to_string()),
            bucket: "oss-bucket".to_string(),
            path_style: None,
            credential_ref: None,
            server_side_encryption_mode: None,
            default_storage_class: None,
            status: Some("active".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("oss provider should be created");
    assert!(!created_oss.path_style);

    let created_minio = service
        .create_storage_provider(CreateStorageProviderCommand {
            id: "provider-minio-001".to_string(),
            provider_kind: DriveStorageProviderKind::S3Compatible,
            name: "MinIO".to_string(),
            endpoint_url: "http://127.0.0.1:9000".to_string(),
            region: Some("us-east-1".to_string()),
            bucket: "minio-bucket".to_string(),
            path_style: None,
            credential_ref: None,
            server_side_encryption_mode: None,
            default_storage_class: None,
            status: Some("active".to_string()),
            operator_id: "admin-001".to_string(),
        })
        .await
        .expect("s3 compatible provider should be created");
    assert!(created_minio.path_style);
}
