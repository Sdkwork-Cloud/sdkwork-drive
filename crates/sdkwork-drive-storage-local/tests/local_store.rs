use sdkwork_drive_storage_contract::{
    DeleteObjectRequest, DriveObjectLocator, DriveObjectStore, HeadObjectRequest,
    ListBucketsRequest, ListObjectsRequest, PresignDownloadRequest, PutObjectRequest,
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

#[tokio::test]
async fn local_store_lists_bucket_directories_in_stable_order() {
    let temp_dir = tempfile::tempdir().expect("temp dir must be created");
    let store = LocalDriveObjectStore::new(temp_dir.path());
    store
        .create_bucket(sdkwork_drive_storage_contract::CreateBucketRequest {
            bucket: "tenant-b".to_string(),
        })
        .await
        .expect("tenant-b bucket should be created");
    store
        .create_bucket(sdkwork_drive_storage_contract::CreateBucketRequest {
            bucket: "tenant-a".to_string(),
        })
        .await
        .expect("tenant-a bucket should be created");
    std::fs::write(temp_dir.path().join("not-a-bucket.txt"), b"ignore")
        .expect("root file should be created");

    let response = store
        .list_buckets(ListBucketsRequest)
        .await
        .expect("bucket list should succeed");

    assert_eq!(
        response
            .items
            .iter()
            .map(|item| item.bucket.as_str())
            .collect::<Vec<_>>(),
        vec!["tenant-a", "tenant-b"]
    );
}

#[tokio::test]
async fn local_store_rejects_zero_max_keys_without_silent_clamp() {
    let temp_dir = tempfile::tempdir().expect("temp dir must be created");
    let store = LocalDriveObjectStore::new(temp_dir.path());
    store
        .create_bucket(sdkwork_drive_storage_contract::CreateBucketRequest {
            bucket: "tenant-001".to_string(),
        })
        .await
        .expect("bucket should be created");

    let err = store
        .list_objects(ListObjectsRequest {
            bucket: "tenant-001".to_string(),
            prefix: None,
            delimiter: None,
            continuation_token: None,
            max_keys: 0,
        })
        .await
        .expect_err("max_keys=0 should be rejected");

    assert_eq!(err.code(), "invalid_request");
    assert!(err.message.contains("max_keys"));
}

#[tokio::test]
async fn local_store_rejects_invalid_list_prefix_and_delimiter() {
    let temp_dir = tempfile::tempdir().expect("temp dir must be created");
    let store = LocalDriveObjectStore::new(temp_dir.path());
    store
        .create_bucket(sdkwork_drive_storage_contract::CreateBucketRequest {
            bucket: "tenant-001".to_string(),
        })
        .await
        .expect("bucket should be created");

    for (prefix, delimiter, field_name) in [
        (Some(" spaces/".to_string()), None, "prefix"),
        (Some("/spaces".to_string()), None, "prefix"),
        (Some("spaces//".to_string()), None, "prefix"),
        (Some("spaces/../secret".to_string()), None, "prefix"),
        (None, Some("::".to_string()), "delimiter"),
    ] {
        let err = store
            .list_objects(ListObjectsRequest {
                bucket: "tenant-001".to_string(),
                prefix,
                delimiter,
                continuation_token: None,
                max_keys: 100,
            })
            .await
            .expect_err("invalid list options should be rejected");

        assert_eq!(err.code(), "invalid_request");
        assert!(
            err.message.contains(field_name),
            "error should name {field_name}: {}",
            err.message
        );
    }
}

#[tokio::test]
async fn local_store_rejects_zero_presign_download_expiry() {
    let temp_dir = tempfile::tempdir().expect("temp dir must be created");
    let store = LocalDriveObjectStore::new(temp_dir.path());
    let locator = DriveObjectLocator {
        bucket: "tenant-001".to_string(),
        object_key: "spaces/knowledge/doc-001.txt".to_string(),
    };
    store
        .put_object(PutObjectRequest {
            locator: locator.clone(),
            content_type: Some("text/plain".to_string()),
            metadata: BTreeMap::new(),
            body: b"hello-drive".to_vec(),
            checksum_sha256_hex: None,
        })
        .await
        .expect("object should be written");

    let err = store
        .presign_download(PresignDownloadRequest {
            locator,
            expires_in_seconds: 0,
        })
        .await
        .expect_err("zero download presign expiry should be rejected");

    assert_eq!(err.code(), "invalid_request");
    assert!(err.message.contains("expires_in_seconds"));
}
