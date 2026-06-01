use sdkwork_drive_storage_contract::{
    DriveObjectStoreError, DriveStorageProviderCapabilities, DriveStorageProviderKind,
};

#[test]
fn provider_kind_includes_s3_compatible() {
    assert_eq!(
        DriveStorageProviderKind::S3Compatible.as_str(),
        "s3_compatible"
    );
}

#[test]
fn default_s3_capabilities_cover_multipart_and_presign() {
    let capabilities = DriveStorageProviderCapabilities::default_s3_compatible();
    assert!(capabilities.supports_multipart_upload);
    assert!(capabilities.supports_presigned_upload_part);
    assert!(capabilities.supports_presigned_download);
    assert!(capabilities.supports_range_read);
}

#[test]
fn stable_error_codes_do_not_leak_vendor_sdk_surface() {
    let error = DriveObjectStoreError::upstream("request timeout");
    assert_eq!(error.code(), "upstream_error");
    assert!(!error.to_string().to_lowercase().contains("aws_sdk"));
}
