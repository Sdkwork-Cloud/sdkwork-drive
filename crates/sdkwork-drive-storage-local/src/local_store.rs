use async_trait::async_trait;
use sdkwork_drive_storage_contract::{
    AbortMultipartUploadRequest, CompleteMultipartUploadRequest, CompleteMultipartUploadResponse,
    CreateMultipartUploadRequest, CreateMultipartUploadResponse, DeleteObjectRequest,
    DeleteObjectResponse, DriveObjectChunkStream, DriveObjectLocator, DriveObjectStore,
    DriveObjectStoreError, DriveObjectStoreErrorKind, DriveStorageProviderCapabilities,
    DriveStorageProviderKind, HeadObjectRequest, HeadObjectResponse, PresignDownloadRequest,
    PresignUploadPartRequest, PresignedDownloadResponse, PresignedUploadPartResponse,
    PutObjectRequest, PutObjectResponse, ReadObjectRangeRequest, ReadObjectRangeResponse,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct LocalDriveObjectStore {
    root_dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalObjectMetadata {
    content_type: Option<String>,
    metadata: std::collections::BTreeMap<String, String>,
    checksum_sha256_hex: Option<String>,
}

#[derive(Debug)]
struct SingleChunkStream {
    body: Option<Vec<u8>>,
}

#[async_trait]
impl DriveObjectChunkStream for SingleChunkStream {
    async fn next_chunk(&mut self) -> Result<Option<Vec<u8>>, DriveObjectStoreError> {
        Ok(self.body.take())
    }
}

impl LocalDriveObjectStore {
    pub fn new(root_dir: impl AsRef<Path>) -> Self {
        Self {
            root_dir: root_dir.as_ref().to_path_buf(),
        }
    }

    fn validate_relative_segment(
        value: &str,
        segment_name: &str,
    ) -> Result<(), DriveObjectStoreError> {
        if value.trim().is_empty() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                format!("{segment_name} must not be empty"),
            ));
        }

        let path = Path::new(value);
        if path.is_absolute() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                format!("{segment_name} must be a relative path"),
            ));
        }

        for component in path.components() {
            match component {
                Component::Normal(_) => {}
                _ => {
                    return Err(DriveObjectStoreError::new(
                        DriveObjectStoreErrorKind::InvalidRequest,
                        format!("{segment_name} contains invalid component"),
                    ));
                }
            }
        }

        Ok(())
    }

    fn object_path(&self, locator: &DriveObjectLocator) -> Result<PathBuf, DriveObjectStoreError> {
        Self::validate_relative_segment(&locator.bucket, "bucket")?;
        Self::validate_relative_segment(&locator.object_key, "object_key")?;
        Ok(self
            .root_dir
            .join(&locator.bucket)
            .join(&locator.object_key))
    }

    fn metadata_path(object_path: &Path) -> PathBuf {
        PathBuf::from(format!("{}.meta.json", object_path.display()))
    }

    fn ensure_parent_dir(path: &Path) -> Result<(), DriveObjectStoreError> {
        let parent = path.parent().ok_or_else(|| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                "object path parent is missing",
            )
        })?;
        fs::create_dir_all(parent).map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("create object parent dir failed: {error}"),
            )
        })
    }

    fn calculate_sha256_hex(body: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(body);
        format!("{:x}", hasher.finalize())
    }

    fn now_epoch_ms() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or(0)
    }
}

#[async_trait]
impl DriveObjectStore for LocalDriveObjectStore {
    fn provider_kind(&self) -> DriveStorageProviderKind {
        DriveStorageProviderKind::LocalFilesystem
    }

    fn capabilities(&self) -> DriveStorageProviderCapabilities {
        DriveStorageProviderCapabilities::default_local_filesystem()
    }

    async fn put_object(
        &self,
        request: PutObjectRequest,
    ) -> Result<PutObjectResponse, DriveObjectStoreError> {
        let object_path = self.object_path(&request.locator)?;
        Self::ensure_parent_dir(&object_path)?;

        fs::write(&object_path, &request.body).map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("write object failed: {error}"),
            )
        })?;

        let checksum = request
            .checksum_sha256_hex
            .or_else(|| Some(Self::calculate_sha256_hex(&request.body)));
        let metadata_payload = LocalObjectMetadata {
            content_type: request.content_type,
            metadata: request.metadata,
            checksum_sha256_hex: checksum,
        };
        let metadata_text = serde_json::to_string_pretty(&metadata_payload).map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("serialize metadata failed: {error}"),
            )
        })?;
        let metadata_path = Self::metadata_path(&object_path);
        fs::write(metadata_path, metadata_text).map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("write metadata failed: {error}"),
            )
        })?;

        Ok(PutObjectResponse {
            locator: request.locator,
            etag: None,
            version_id: None,
        })
    }

    async fn head_object(
        &self,
        request: HeadObjectRequest,
    ) -> Result<HeadObjectResponse, DriveObjectStoreError> {
        let object_path = self.object_path(&request.locator)?;
        let stat = fs::metadata(&object_path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                return DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::NotFound,
                    "object not found",
                );
            }
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("stat object failed: {error}"),
            )
        })?;

        let metadata_path = Self::metadata_path(&object_path);
        let metadata = if metadata_path.exists() {
            let metadata_text = fs::read_to_string(&metadata_path).map_err(|error| {
                DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::Internal,
                    format!("read metadata failed: {error}"),
                )
            })?;
            serde_json::from_str::<LocalObjectMetadata>(&metadata_text).map_err(|error| {
                DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::Internal,
                    format!("parse metadata failed: {error}"),
                )
            })?
        } else {
            LocalObjectMetadata {
                content_type: None,
                metadata: std::collections::BTreeMap::new(),
                checksum_sha256_hex: None,
            }
        };

        Ok(HeadObjectResponse {
            locator: request.locator,
            content_length: stat.len(),
            content_type: metadata.content_type,
            etag: None,
            version_id: None,
            checksum_sha256_hex: metadata.checksum_sha256_hex,
            metadata: metadata.metadata,
        })
    }

    async fn delete_object(
        &self,
        request: DeleteObjectRequest,
    ) -> Result<DeleteObjectResponse, DriveObjectStoreError> {
        let object_path = self.object_path(&request.locator)?;
        let metadata_path = Self::metadata_path(&object_path);

        let deleted = if object_path.exists() {
            fs::remove_file(&object_path).map_err(|error| {
                DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::Internal,
                    format!("delete object failed: {error}"),
                )
            })?;
            true
        } else {
            false
        };

        if metadata_path.exists() {
            fs::remove_file(metadata_path).map_err(|error| {
                DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::Internal,
                    format!("delete metadata failed: {error}"),
                )
            })?;
        }

        Ok(DeleteObjectResponse {
            locator: request.locator,
            deleted,
        })
    }

    async fn create_multipart_upload(
        &self,
        request: CreateMultipartUploadRequest,
    ) -> Result<CreateMultipartUploadResponse, DriveObjectStoreError> {
        let _ = request;
        Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::NotSupported,
            "local filesystem adapter does not support multipart upload",
        ))
    }

    async fn presign_upload_part(
        &self,
        request: PresignUploadPartRequest,
    ) -> Result<PresignedUploadPartResponse, DriveObjectStoreError> {
        let _ = request;
        Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::NotSupported,
            "local filesystem adapter does not support presigned upload part",
        ))
    }

    async fn complete_multipart_upload(
        &self,
        request: CompleteMultipartUploadRequest,
    ) -> Result<CompleteMultipartUploadResponse, DriveObjectStoreError> {
        let _ = request;
        Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::NotSupported,
            "local filesystem adapter does not support complete multipart upload",
        ))
    }

    async fn abort_multipart_upload(
        &self,
        request: AbortMultipartUploadRequest,
    ) -> Result<(), DriveObjectStoreError> {
        let _ = request;
        Err(DriveObjectStoreError::new(
            DriveObjectStoreErrorKind::NotSupported,
            "local filesystem adapter does not support abort multipart upload",
        ))
    }

    async fn presign_download(
        &self,
        request: PresignDownloadRequest,
    ) -> Result<PresignedDownloadResponse, DriveObjectStoreError> {
        let object_path = self.object_path(&request.locator)?;
        if !object_path.exists() {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::NotFound,
                "object not found",
            ));
        }
        Ok(PresignedDownloadResponse {
            method: "GET".to_string(),
            url: format!(
                "file://{}",
                object_path.to_string_lossy().replace('\\', "/")
            ),
            headers: std::collections::BTreeMap::new(),
            expires_at_epoch_ms: Self::now_epoch_ms()
                + i64::from(request.expires_in_seconds) * 1000,
        })
    }

    async fn read_object_range(
        &self,
        request: ReadObjectRangeRequest,
    ) -> Result<(ReadObjectRangeResponse, Box<dyn DriveObjectChunkStream>), DriveObjectStoreError>
    {
        let object_path = self.object_path(&request.locator)?;
        let bytes = fs::read(&object_path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                return DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::NotFound,
                    "object not found",
                );
            }
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::Internal,
                format!("read object failed: {error}"),
            )
        })?;

        let total_len = bytes.len() as u64;
        if request.range.start_inclusive >= total_len
            || request.range.end_inclusive >= total_len
            || request.range.start_inclusive > request.range.end_inclusive
        {
            return Err(DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                "byte range is out of bounds",
            ));
        }

        let start = request.range.start_inclusive as usize;
        let end = request.range.end_inclusive as usize;
        let slice = bytes[start..=end].to_vec();

        let response = ReadObjectRangeResponse {
            locator: request.locator,
            content_type: None,
            etag: None,
            content_length: slice.len() as u64,
        };
        Ok((response, Box::new(SingleChunkStream { body: Some(slice) })))
    }
}
