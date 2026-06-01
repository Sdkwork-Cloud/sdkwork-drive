use sdkwork_drive_storage_contract::{
    DeleteObjectRequest, DriveObjectLocator, DriveObjectStore, HeadObjectRequest, PutObjectRequest,
};
use sdkwork_drive_storage_local::LocalDriveObjectStore;
use std::collections::BTreeMap;

#[tokio::test]
async fn local_store_supports_put_head_delete_roundtrip() {
    let temp_dir = tempfile::tempdir().expect("temp dir must be created");
    let store = LocalDriveObjectStore::new(temp_dir.path());
    let locator = DriveObjectLocator {
        bucket: "tenant-001".to_string(),
        object_key: "spaces/knowledge/doc-001.txt".to_string(),
    };

    let put_response = store
        .put_object(PutObjectRequest {
            locator: locator.clone(),
            content_type: Some("text/plain".to_string()),
            metadata: BTreeMap::from([("space_type".to_string(), "knowledge_base".to_string())]),
            body: b"hello-drive".to_vec(),
            checksum_sha256_hex: None,
        })
        .await
        .expect("put object should succeed");
    assert_eq!(put_response.locator.object_key, locator.object_key);

    let head_response = store
        .head_object(HeadObjectRequest {
            locator: locator.clone(),
        })
        .await
        .expect("head object should succeed");
    assert_eq!(head_response.content_length, 11);
    assert_eq!(head_response.content_type.as_deref(), Some("text/plain"));

    let delete_response = store
        .delete_object(DeleteObjectRequest {
            locator: locator.clone(),
        })
        .await
        .expect("delete object should succeed");
    assert!(delete_response.deleted);

    let head_after_delete = store
        .head_object(HeadObjectRequest { locator })
        .await
        .expect_err("head on deleted object should fail");
    assert_eq!(head_after_delete.code(), "not_found");
}
