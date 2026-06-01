use sdkwork_drive_storage_contract::{DriveObjectStore, DriveStorageProviderKind};
use sdkwork_drive_storage_s3::{S3DriveObjectStore, S3ProviderProfile, S3StoreConfig};

#[test]
fn s3_config_validation_rejects_empty_bucket() {
    let config = S3StoreConfig {
        provider_profile: S3ProviderProfile::Minio,
        endpoint: Some("http://127.0.0.1:9000".to_string()),
        region: "us-east-1".to_string(),
        default_bucket: String::new(),
        access_key_id: "minioadmin".to_string(),
        secret_access_key: "minioadmin".to_string(),
        session_token: None,
        force_path_style: true,
        strict_tls: false,
    };

    let err = config.validate().expect_err("bucket is required");
    assert_eq!(err.code(), "invalid_request");
}

#[tokio::test]
async fn s3_store_reports_s3_compatible_capabilities() {
    let config = S3StoreConfig {
        provider_profile: S3ProviderProfile::Minio,
        endpoint: Some("http://127.0.0.1:9000".to_string()),
        region: "us-east-1".to_string(),
        default_bucket: "sdkwork-drive-test".to_string(),
        access_key_id: "minioadmin".to_string(),
        secret_access_key: "minioadmin".to_string(),
        session_token: None,
        force_path_style: true,
        strict_tls: false,
    };

    let store = S3DriveObjectStore::new(config)
        .await
        .expect("s3 store should be created");
    assert_eq!(
        store.provider_kind(),
        DriveStorageProviderKind::S3Compatible
    );

    let capabilities = store.capabilities();
    assert!(capabilities.supports_multipart_upload);
    assert!(capabilities.supports_presigned_upload_part);
    assert!(capabilities.supports_presigned_download);
    assert!(capabilities.supports_range_read);
}

#[tokio::test]
#[ignore = "requires MinIO or S3-compatible endpoint"]
async fn s3_store_supports_multipart_and_presign() {
    // Integration flow is enabled in later iteration with docker-compose.minio-test.yml.
}

#[test]
fn provider_profile_infers_from_custom_vendor_key() {
    assert_eq!(
        S3ProviderProfile::from_provider_kind("custom:cloudflare_r2", None),
        S3ProviderProfile::CloudflareR2
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind("custom:tencent_cos", None),
        S3ProviderProfile::TencentCos
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind("custom:huawei_obs", None),
        S3ProviderProfile::HuaweiObs
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind("custom:aws_s3", None),
        S3ProviderProfile::AwsS3
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind("custom:minio", None),
        S3ProviderProfile::Minio
    );
}

#[test]
fn provider_profile_infers_from_endpoint_when_provider_kind_is_s3_compatible() {
    assert_eq!(
        S3ProviderProfile::from_provider_kind(
            "s3_compatible",
            Some("https://abc123.r2.cloudflarestorage.com"),
        ),
        S3ProviderProfile::CloudflareR2
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind(
            "s3_compatible",
            Some("https://oss-cn-hangzhou.aliyuncs.com")
        ),
        S3ProviderProfile::AliyunOss
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind(
            "s3_compatible",
            Some("https://cos.ap-guangzhou.myqcloud.com"),
        ),
        S3ProviderProfile::TencentCos
    );
    assert_eq!(
        S3ProviderProfile::from_provider_kind(
            "s3_compatible",
            Some("https://obs.cn-north-4.myhuaweicloud.com"),
        ),
        S3ProviderProfile::HuaweiObs
    );
}

#[test]
fn provider_profile_defaults_match_s3_provider_expectations() {
    assert_eq!(S3ProviderProfile::CloudflareR2.default_region(), "auto");
    assert_eq!(S3ProviderProfile::AwsS3.default_region(), "us-east-1");
    assert!(S3ProviderProfile::Minio.default_force_path_style());
    assert!(!S3ProviderProfile::AwsS3.default_force_path_style());
    assert!(!S3ProviderProfile::AliyunOss.default_force_path_style());
}
