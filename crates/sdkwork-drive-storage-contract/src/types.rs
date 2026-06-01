use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::error::Error;
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DriveStorageProviderKind {
    LocalFilesystem,
    S3Compatible,
    AzureBlob,
    GoogleCloudStorage,
    AliyunOss,
    Custom(String),
}

impl DriveStorageProviderKind {
    pub fn as_str(&self) -> &str {
        match self {
            Self::LocalFilesystem => "local_filesystem",
            Self::S3Compatible => "s3_compatible",
            Self::AzureBlob => "azure_blob",
            Self::GoogleCloudStorage => "google_cloud_storage",
            Self::AliyunOss => "aliyun_oss",
            Self::Custom(value) => value.as_str(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DriveStorageProviderCapabilities {
    pub supports_multipart_upload: bool,
    pub supports_presigned_upload_part: bool,
    pub supports_presigned_download: bool,
    pub supports_range_read: bool,
    pub supports_server_side_copy: bool,
    pub supports_versioning: bool,
}

impl DriveStorageProviderCapabilities {
    pub const fn default_s3_compatible() -> Self {
        Self {
            supports_multipart_upload: true,
            supports_presigned_upload_part: true,
            supports_presigned_download: true,
            supports_range_read: true,
            supports_server_side_copy: true,
            supports_versioning: true,
        }
    }

    pub const fn default_local_filesystem() -> Self {
        Self {
            supports_multipart_upload: false,
            supports_presigned_upload_part: false,
            supports_presigned_download: false,
            supports_range_read: true,
            supports_server_side_copy: false,
            supports_versioning: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DriveObjectLocator {
    pub bucket: String,
    pub object_key: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DriveByteRange {
    pub start_inclusive: u64,
    pub end_inclusive: u64,
}

pub type DriveObjectHeaders = BTreeMap<String, String>;
pub type DriveObjectMetadata = BTreeMap<String, String>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PutObjectRequest {
    pub locator: DriveObjectLocator,
    pub content_type: Option<String>,
    pub metadata: DriveObjectMetadata,
    pub body: Vec<u8>,
    pub checksum_sha256_hex: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PutObjectResponse {
    pub locator: DriveObjectLocator,
    pub etag: Option<String>,
    pub version_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HeadObjectRequest {
    pub locator: DriveObjectLocator,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HeadObjectResponse {
    pub locator: DriveObjectLocator,
    pub content_length: u64,
    pub content_type: Option<String>,
    pub etag: Option<String>,
    pub version_id: Option<String>,
    pub checksum_sha256_hex: Option<String>,
    pub metadata: DriveObjectMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeleteObjectRequest {
    pub locator: DriveObjectLocator,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeleteObjectResponse {
    pub locator: DriveObjectLocator,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateMultipartUploadRequest {
    pub locator: DriveObjectLocator,
    pub content_type: Option<String>,
    pub metadata: DriveObjectMetadata,
    pub checksum_sha256_hex: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateMultipartUploadResponse {
    pub locator: DriveObjectLocator,
    pub upload_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PresignUploadPartRequest {
    pub locator: DriveObjectLocator,
    pub upload_id: String,
    pub part_number: u16,
    pub expires_in_seconds: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PresignedUploadPartResponse {
    pub method: String,
    pub url: String,
    pub headers: DriveObjectHeaders,
    pub expires_at_epoch_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompletedMultipartPart {
    pub part_number: u16,
    pub etag: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompleteMultipartUploadRequest {
    pub locator: DriveObjectLocator,
    pub upload_id: String,
    pub parts: Vec<CompletedMultipartPart>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompleteMultipartUploadResponse {
    pub locator: DriveObjectLocator,
    pub etag: Option<String>,
    pub version_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AbortMultipartUploadRequest {
    pub locator: DriveObjectLocator,
    pub upload_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PresignDownloadRequest {
    pub locator: DriveObjectLocator,
    pub expires_in_seconds: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PresignedDownloadResponse {
    pub method: String,
    pub url: String,
    pub headers: DriveObjectHeaders,
    pub expires_at_epoch_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReadObjectRangeRequest {
    pub locator: DriveObjectLocator,
    pub range: DriveByteRange,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReadObjectRangeResponse {
    pub locator: DriveObjectLocator,
    pub content_type: Option<String>,
    pub etag: Option<String>,
    pub content_length: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DriveObjectStoreErrorKind {
    NotFound,
    InvalidRequest,
    Conflict,
    RateLimited,
    PermissionDenied,
    Timeout,
    Unavailable,
    IntegrityFailed,
    UpstreamError,
    NotSupported,
    Internal,
}

impl DriveObjectStoreErrorKind {
    pub fn as_code(self) -> &'static str {
        match self {
            Self::NotFound => "not_found",
            Self::InvalidRequest => "invalid_request",
            Self::Conflict => "conflict",
            Self::RateLimited => "rate_limited",
            Self::PermissionDenied => "permission_denied",
            Self::Timeout => "timeout",
            Self::Unavailable => "unavailable",
            Self::IntegrityFailed => "integrity_failed",
            Self::UpstreamError => "upstream_error",
            Self::NotSupported => "not_supported",
            Self::Internal => "internal_error",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DriveObjectStoreError {
    pub kind: DriveObjectStoreErrorKind,
    pub message: String,
}

impl DriveObjectStoreError {
    pub fn new(kind: DriveObjectStoreErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub fn upstream(message: impl Into<String>) -> Self {
        Self::new(DriveObjectStoreErrorKind::UpstreamError, message)
    }

    pub fn code(&self) -> &'static str {
        self.kind.as_code()
    }
}

impl Display for DriveObjectStoreError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code(), self.message)
    }
}

impl Error for DriveObjectStoreError {}
