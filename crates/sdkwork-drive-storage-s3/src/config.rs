use sdkwork_drive_storage_contract::{DriveObjectStoreError, DriveObjectStoreErrorKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum S3ProviderProfile {
    AwsS3,
    Minio,
    CloudflareR2,
    AliyunOss,
    TencentCos,
    HuaweiObs,
    GoogleCloudStorage,
    BackblazeB2,
    GenericCompatible,
}

impl S3ProviderProfile {
    const CUSTOM_PREFIX: &'static str = "custom:";

    pub fn as_str(self) -> &'static str {
        match self {
            Self::AwsS3 => "aws_s3",
            Self::Minio => "minio",
            Self::CloudflareR2 => "cloudflare_r2",
            Self::AliyunOss => "aliyun_oss",
            Self::TencentCos => "tencent_cos",
            Self::HuaweiObs => "huawei_obs",
            Self::GoogleCloudStorage => "google_cloud_storage",
            Self::BackblazeB2 => "backblaze_b2",
            Self::GenericCompatible => "generic_s3_compatible",
        }
    }

    pub fn default_region(self) -> &'static str {
        match self {
            Self::CloudflareR2 => "auto",
            _ => "us-east-1",
        }
    }

    pub fn default_force_path_style(self) -> bool {
        match self {
            Self::AwsS3 => false,
            Self::GoogleCloudStorage => false,
            Self::AliyunOss => false,
            Self::TencentCos => false,
            Self::HuaweiObs => false,
            Self::BackblazeB2 => false,
            Self::CloudflareR2 => true,
            Self::Minio => true,
            Self::GenericCompatible => true,
        }
    }

    pub fn from_provider_kind(provider_kind: &str, endpoint: Option<&str>) -> Self {
        let normalized = provider_kind.trim().to_ascii_lowercase();
        if normalized == "s3_compatible" {
            if let Some(endpoint_value) = endpoint {
                if let Some(profile) = Self::from_endpoint(endpoint_value) {
                    return profile;
                }
            }
            return Self::GenericCompatible;
        }
        if normalized == "aliyun_oss" {
            return Self::AliyunOss;
        }
        if normalized == "google_cloud_storage" {
            return Self::GoogleCloudStorage;
        }
        if let Some(suffix) = normalized.strip_prefix(Self::CUSTOM_PREFIX) {
            if let Some(profile) = Self::from_vendor_key(suffix) {
                return profile;
            }
        }
        if let Some(endpoint_value) = endpoint {
            if let Some(profile) = Self::from_endpoint(endpoint_value) {
                return profile;
            }
        }
        Self::GenericCompatible
    }

    fn from_vendor_key(raw: &str) -> Option<Self> {
        let normalized = raw.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "aws" | "aws_s3" | "amazon_s3" => Some(Self::AwsS3),
            "minio" => Some(Self::Minio),
            "r2" | "cloudflare" | "cloudflare_r2" => Some(Self::CloudflareR2),
            "oss" | "aliyun" | "aliyun_oss" | "alibaba_oss" => Some(Self::AliyunOss),
            "cos" | "tencent" | "tencent_cos" => Some(Self::TencentCos),
            "obs" | "huawei" | "huawei_obs" => Some(Self::HuaweiObs),
            "gcs" | "google_cloud_storage" | "google_storage" => Some(Self::GoogleCloudStorage),
            "b2" | "backblaze" | "backblaze_b2" => Some(Self::BackblazeB2),
            "s3_compatible" | "generic_s3" | "generic_s3_compatible" => {
                Some(Self::GenericCompatible)
            }
            _ => None,
        }
    }

    fn from_endpoint(raw: &str) -> Option<Self> {
        let normalized = raw.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            return None;
        }
        if normalized.contains(".r2.cloudflarestorage.com") {
            return Some(Self::CloudflareR2);
        }
        if normalized.contains("aliyuncs.com") {
            return Some(Self::AliyunOss);
        }
        if normalized.contains(".myqcloud.com") {
            return Some(Self::TencentCos);
        }
        if normalized.contains(".myhuaweicloud.com") {
            return Some(Self::HuaweiObs);
        }
        if normalized.contains("storage.googleapis.com") {
            return Some(Self::GoogleCloudStorage);
        }
        if normalized.contains("backblazeb2.com") {
            return Some(Self::BackblazeB2);
        }
        if normalized.contains("amazonaws.com") {
            return Some(Self::AwsS3);
        }
        if normalized.contains("minio") || normalized.contains("127.0.0.1:9000") {
            return Some(Self::Minio);
        }
        None
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct S3StoreConfig {
    pub provider_profile: S3ProviderProfile,
    pub endpoint: Option<String>,
    pub region: String,
    pub default_bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub session_token: Option<String>,
    pub force_path_style: bool,
    pub strict_tls: bool,
}

impl S3StoreConfig {
    pub fn validate(&self) -> Result<(), DriveObjectStoreError> {
        if self.region.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "region must not be empty",
            ));
        }
        if self.default_bucket.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "default_bucket must not be empty",
            ));
        }
        if self.access_key_id.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "access_key_id must not be empty",
            ));
        }
        if self.secret_access_key.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "secret_access_key must not be empty",
            ));
        }
        if self.strict_tls
            && self
                .endpoint
                .as_ref()
                .is_some_and(|endpoint| endpoint.to_ascii_lowercase().starts_with("http://"))
        {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "strict_tls=true requires an https endpoint",
            ));
        }
        Ok(())
    }

    pub fn resolve_bucket(&self, requested_bucket: &str) -> String {
        let trimmed = requested_bucket.trim();
        if trimmed.is_empty() {
            return self.default_bucket.clone();
        }
        trimmed.to_string()
    }
}
