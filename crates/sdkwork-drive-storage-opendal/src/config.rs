use sdkwork_drive_storage_contract::{
    resolve_drive_storage_credentials, validate_s3_bucket_name, DriveObjectStoreError,
    DriveObjectStoreErrorKind, DriveStorageCredentialSnapshot, DriveStorageProviderKind,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpendalS3ProviderProfile {
    AwsS3,
    Minio,
    CloudflareR2,
    AliyunOss,
    TencentCos,
    HuaweiObs,
    VolcengineTos,
    GoogleCloudStorage,
    BackblazeB2,
    GenericCompatible,
}

impl OpendalS3ProviderProfile {
    const CUSTOM_PREFIX: &'static str = "custom:";

    pub fn as_str(self) -> &'static str {
        match self {
            Self::AwsS3 => "aws_s3",
            Self::Minio => "minio",
            Self::CloudflareR2 => "cloudflare_r2",
            Self::AliyunOss => "aliyun_oss",
            Self::TencentCos => "tencent_cos",
            Self::HuaweiObs => "huawei_obs",
            Self::VolcengineTos => "volcengine_tos",
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
            Self::AwsS3
            | Self::AliyunOss
            | Self::TencentCos
            | Self::HuaweiObs
            | Self::VolcengineTos
            | Self::GoogleCloudStorage
            | Self::BackblazeB2 => false,
            Self::CloudflareR2 | Self::Minio | Self::GenericCompatible => true,
        }
    }

    pub fn from_provider_kind(provider_kind: &str, endpoint: Option<&str>) -> Self {
        let normalized = provider_kind.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "aliyun_oss" => return Self::AliyunOss,
            "tencent_cos" => return Self::TencentCos,
            "huawei_obs" => return Self::HuaweiObs,
            "volcengine_tos" => return Self::VolcengineTos,
            "google_cloud_storage" => return Self::GoogleCloudStorage,
            _ => {}
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
        match raw.trim().to_ascii_lowercase().as_str() {
            "aws" | "aws_s3" | "amazon_s3" => Some(Self::AwsS3),
            "minio" => Some(Self::Minio),
            "r2" | "cloudflare" | "cloudflare_r2" => Some(Self::CloudflareR2),
            "oss" | "aliyun" | "aliyun_oss" | "alibaba_oss" => Some(Self::AliyunOss),
            "cos" | "tencent" | "tencent_cos" => Some(Self::TencentCos),
            "obs" | "huawei" | "huawei_obs" => Some(Self::HuaweiObs),
            "tos" | "volc" | "volcengine" | "volcengine_tos" | "volcano" | "volcano_tos"
            | "bytedance_tos" => Some(Self::VolcengineTos),
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
        if normalized.contains(".volces.com") || normalized.contains("volcengine") {
            return Some(Self::VolcengineTos);
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
pub struct OpendalS3StoreConfig {
    pub provider_kind: DriveStorageProviderKind,
    pub provider_profile: OpendalS3ProviderProfile,
    pub endpoint: Option<String>,
    pub region: String,
    pub default_bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub session_token: Option<String>,
    pub root: Option<String>,
    pub force_path_style: bool,
    pub strict_tls: bool,
    pub disable_config_load: bool,
    pub server_side_encryption: Option<String>,
    pub default_storage_class: Option<String>,
}

impl OpendalS3StoreConfig {
    pub fn from_provider_parts(
        provider_kind: &str,
        endpoint_url: &str,
        region: Option<&str>,
        default_bucket: &str,
        force_path_style: Option<bool>,
        credential_ref: Option<&str>,
        root: Option<&str>,
        server_side_encryption: Option<&str>,
        default_storage_class: Option<&str>,
        strict_tls_override: Option<bool>,
    ) -> Result<Self, DriveObjectStoreError> {
        let provider_kind = parse_provider_kind(provider_kind)?;
        let endpoint = normalize_http_endpoint(endpoint_url)?;
        let provider_profile =
            OpendalS3ProviderProfile::from_provider_kind(provider_kind.as_str(), Some(&endpoint));
        let credentials = resolve_credentials(credential_ref)?;
        let strict_tls = strict_tls_override
            .unwrap_or_else(|| !endpoint.to_ascii_lowercase().starts_with("http://"));
        let region = region
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
            .or_else(|| {
                std::env::var("SDKWORK_DRIVE_S3_REGION")
                    .ok()
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty())
            })
            .unwrap_or_else(|| provider_profile.default_region().to_string());
        let config = Self {
            provider_kind,
            provider_profile,
            endpoint: Some(endpoint),
            region,
            default_bucket: default_bucket.to_string(),
            access_key_id: credentials.access_key_id,
            secret_access_key: credentials.secret_access_key,
            session_token: credentials.session_token,
            root: normalize_root_prefix(root)?,
            force_path_style: force_path_style
                .unwrap_or_else(|| provider_profile.default_force_path_style()),
            strict_tls,
            disable_config_load: true,
            server_side_encryption: normalize_optional(server_side_encryption),
            default_storage_class: normalize_optional(default_storage_class),
        };
        config.validate()?;
        Ok(config)
    }

    pub fn validate(&self) -> Result<(), DriveObjectStoreError> {
        if matches!(
            self.provider_kind,
            DriveStorageProviderKind::LocalFilesystem
        ) {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "opendal S3 plugin only supports s3-compatible provider kinds",
            ));
        }
        if self.region.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "region must not be empty",
            ));
        }
        validate_s3_bucket_name(&self.default_bucket, "default_bucket")?;
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
        if let Some(root) = self.root.as_deref() {
            validate_prefix(root, "root")?;
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

    pub fn resolve_bucket(&self, requested_bucket: &str) -> Result<String, DriveObjectStoreError> {
        let trimmed = requested_bucket.trim();
        if trimmed.is_empty() {
            return Ok(self.default_bucket.clone());
        }
        validate_s3_bucket_name(trimmed, "bucket")?;
        Ok(trimmed.to_string())
    }
}

fn parse_provider_kind(raw: &str) -> Result<DriveStorageProviderKind, DriveObjectStoreError> {
    let normalized = raw.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "s3_compatible" => Ok(DriveStorageProviderKind::S3Compatible),
        "aliyun_oss" => Ok(DriveStorageProviderKind::AliyunOss),
        "tencent_cos" => Ok(DriveStorageProviderKind::TencentCos),
        "huawei_obs" => Ok(DriveStorageProviderKind::HuaweiObs),
        "volcengine_tos" => Ok(DriveStorageProviderKind::VolcengineTos),
        "google_cloud_storage" => Ok(DriveStorageProviderKind::GoogleCloudStorage),
        _ => {
            let Some(suffix) = normalized.strip_prefix("custom:") else {
                return Err(DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::InvalidRequest,
                    "provider_kind is invalid for opendal S3 plugin",
                ));
            };
            if suffix.len() < 2
                || suffix.len() > 32
                || !suffix.bytes().all(|byte| {
                    byte.is_ascii_lowercase()
                        || byte.is_ascii_digit()
                        || matches!(byte, b'_' | b'-')
                })
            {
                return Err(DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::InvalidRequest,
                    "custom provider_kind suffix is invalid",
                ));
            }
            Ok(DriveStorageProviderKind::Custom(normalized))
        }
    }
}

fn normalize_http_endpoint(raw: &str) -> Result<String, DriveObjectStoreError> {
    let endpoint = raw.trim();
    if raw != endpoint {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "endpoint_url must be trimmed",
        ));
    }
    if endpoint.is_empty() {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "endpoint_url must not be empty",
        ));
    }
    if endpoint.chars().any(char::is_whitespace) {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "endpoint_url must not contain whitespace",
        ));
    }
    let lower = endpoint.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "endpoint_url must use http or https scheme",
        ));
    }
    Ok(endpoint.trim_end_matches('/').to_string())
}

fn normalize_root_prefix(raw: Option<&str>) -> Result<Option<String>, DriveObjectStoreError> {
    let Some(value) = raw else {
        return Ok(None);
    };
    let trimmed = value.trim().trim_matches('/').to_string();
    if trimmed.is_empty() {
        return Ok(None);
    }
    validate_prefix(&trimmed, "root")?;
    Ok(Some(trimmed))
}

fn normalize_optional(raw: Option<&str>) -> Option<String> {
    raw.map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

pub(crate) fn validate_object_key(object_key: &str) -> Result<(), DriveObjectStoreError> {
    if object_key != object_key.trim() {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "object_key must be trimmed",
        ));
    }
    if object_key.is_empty() {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "object_key must not be empty",
        ));
    }
    validate_prefix(object_key, "object_key")?;
    if object_key.ends_with('/') {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "object_key must not end with slash",
        ));
    }
    Ok(())
}

pub(crate) fn normalize_list_prefix(
    prefix: Option<String>,
) -> Result<Option<String>, DriveObjectStoreError> {
    let Some(prefix) = prefix else {
        return Ok(None);
    };
    if prefix.trim().is_empty() {
        return Ok(None);
    }
    if prefix != prefix.trim() {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            "prefix must be trimmed",
        ));
    }
    validate_prefix(&prefix, "prefix")?;
    Ok(Some(prefix))
}

fn validate_prefix(value: &str, field_name: &str) -> Result<(), DriveObjectStoreError> {
    if value.len() > 1024 {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            format!("{field_name} must be at most 1024 UTF-8 bytes"),
        ));
    }
    if value.as_bytes().contains(&0) {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            format!("{field_name} must not contain NUL bytes"),
        ));
    }
    if value.starts_with('/') {
        return Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::InvalidRequest,
            format!("{field_name} must not start with slash"),
        ));
    }
    for segment in value.trim_end_matches('/').split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                format!("{field_name} must not contain empty or period-only path segments"),
            ));
        }
    }
    Ok(())
}

fn resolve_credentials(
    credential_ref: Option<&str>,
) -> Result<DriveStorageCredentialSnapshot, DriveObjectStoreError> {
    resolve_drive_storage_credentials(
        credential_ref,
        "SDKWORK_DRIVE_S3_ACCESS_KEY_ID",
        "SDKWORK_DRIVE_S3_SECRET_ACCESS_KEY",
        "SDKWORK_DRIVE_S3_SESSION_TOKEN",
        "opendal S3 plugin",
    )
}
