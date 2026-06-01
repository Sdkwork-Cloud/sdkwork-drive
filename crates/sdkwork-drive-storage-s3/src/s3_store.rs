use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use aws_sdk_s3::{Client, Config};
use aws_types::region::Region;
use sdkwork_drive_storage_contract::{
    AbortMultipartUploadRequest, CompleteMultipartUploadRequest, CompleteMultipartUploadResponse,
    CreateMultipartUploadRequest, CreateMultipartUploadResponse, DeleteObjectRequest,
    DeleteObjectResponse, DriveObjectChunkStream, DriveObjectHeaders, DriveObjectStore,
    DriveObjectStoreError, DriveObjectStoreErrorKind, DriveStorageProviderCapabilities,
    DriveStorageProviderKind, HeadObjectRequest, HeadObjectResponse, PresignDownloadRequest,
    PresignUploadPartRequest, PresignedDownloadResponse, PresignedUploadPartResponse,
    PutObjectRequest, PutObjectResponse, ReadObjectRangeRequest, ReadObjectRangeResponse,
};
use std::collections::BTreeMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::config::S3StoreConfig;

#[derive(Debug, Clone)]
pub struct S3DriveObjectStore {
    client: Client,
    config: S3StoreConfig,
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

impl S3DriveObjectStore {
    pub async fn new(config: S3StoreConfig) -> Result<Self, DriveObjectStoreError> {
        config.validate()?;

        let credentials = Credentials::new(
            config.access_key_id.clone(),
            config.secret_access_key.clone(),
            config.session_token.clone(),
            None,
            "sdkwork-drive-storage-s3",
        );
        let mut loader = aws_config::defaults(BehaviorVersion::latest())
            .region(Region::new(config.region.clone()))
            .credentials_provider(credentials);
        if let Some(endpoint) = config.endpoint.as_ref() {
            loader = loader.endpoint_url(endpoint);
        }
        let shared_config = loader.load().await;

        let mut s3_config_builder = Config::from(&shared_config)
            .to_builder()
            .force_path_style(config.force_path_style)
            .region(Region::new(config.region.clone()))
            .credentials_provider(Credentials::new(
                config.access_key_id.clone(),
                config.secret_access_key.clone(),
                config.session_token.clone(),
                None,
                "sdkwork-drive-storage-s3",
            ));

        if let Some(endpoint) = config.endpoint.clone() {
            s3_config_builder = s3_config_builder.endpoint_url(endpoint);
        }

        let client = Client::from_conf(s3_config_builder.build());
        Ok(Self { client, config })
    }

    fn resolve_bucket(&self, requested_bucket: &str) -> String {
        self.config.resolve_bucket(requested_bucket)
    }

    fn metadata_to_btree(
        source: Option<&std::collections::HashMap<String, String>>,
    ) -> BTreeMap<String, String> {
        match source {
            Some(values) => values
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
            None => BTreeMap::new(),
        }
    }

    fn headers_from_presigned(
        request: &aws_sdk_s3::presigning::PresignedRequest,
    ) -> DriveObjectHeaders {
        request
            .headers()
            .map(|(key, value)| (key.to_string(), value.to_string()))
            .collect()
    }

    fn expires_at_epoch_ms(expires_in_seconds: u32) -> i64 {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as i64)
            .unwrap_or(0);
        now + i64::from(expires_in_seconds) * 1000
    }

    fn map_sdk_error<E>(error: SdkError<E>, default_message: &str) -> DriveObjectStoreError
    where
        E: ProvideErrorMetadata,
    {
        let code = error
            .as_service_error()
            .and_then(ProvideErrorMetadata::code)
            .unwrap_or_default()
            .to_ascii_lowercase();

        let kind = if code.contains("notfound")
            || code.contains("nosuchkey")
            || code.contains("nosuchupload")
        {
            DriveObjectStoreErrorKind::NotFound
        } else if code.contains("invalid") || code.contains("malformed") {
            DriveObjectStoreErrorKind::InvalidRequest
        } else if code.contains("conflict")
            || code.contains("preconditionfailed")
            || code.contains("alreadyexists")
        {
            DriveObjectStoreErrorKind::Conflict
        } else if code.contains("slowdown")
            || code.contains("toomanyrequests")
            || code.contains("throttl")
        {
            DriveObjectStoreErrorKind::RateLimited
        } else if code.contains("accessdenied") || code.contains("forbidden") {
            DriveObjectStoreErrorKind::PermissionDenied
        } else if code.contains("timeout") || code.contains("requesttimeout") {
            DriveObjectStoreErrorKind::Timeout
        } else if code.contains("unavailable")
            || code.contains("serviceunavailable")
            || code.contains("temporarilyunavailable")
        {
            DriveObjectStoreErrorKind::Unavailable
        } else {
            match &error {
                SdkError::ServiceError(_) => DriveObjectStoreErrorKind::UpstreamError,
                SdkError::DispatchFailure(_) | SdkError::TimeoutError(_) => {
                    DriveObjectStoreErrorKind::Unavailable
                }
                _ => DriveObjectStoreErrorKind::Internal,
            }
        };

        let message = error
            .as_service_error()
            .and_then(ProvideErrorMetadata::message)
            .map(str::to_string)
            .unwrap_or_else(|| format!("{default_message}: {error}"));

        DriveObjectStoreError::new(kind, message)
    }
}

#[async_trait]
impl DriveObjectStore for S3DriveObjectStore {
    fn provider_kind(&self) -> DriveStorageProviderKind {
        DriveStorageProviderKind::S3Compatible
    }

    fn capabilities(&self) -> DriveStorageProviderCapabilities {
        DriveStorageProviderCapabilities::default_s3_compatible()
    }

    async fn put_object(
        &self,
        request: PutObjectRequest,
    ) -> Result<PutObjectResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let mut builder = self
            .client
            .put_object()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .body(request.body.into());

        if let Some(content_type) = request.content_type {
            builder = builder.content_type(content_type);
        }
        if let Some(checksum) = request.checksum_sha256_hex {
            builder = builder.checksum_sha256(checksum);
        }
        for (key, value) in request.metadata {
            builder = builder.metadata(key, value);
        }

        let output = builder
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "put object failed"))?;

        Ok(PutObjectResponse {
            locator: request.locator,
            etag: output.e_tag().map(str::to_string),
            version_id: output.version_id().map(str::to_string),
        })
    }

    async fn head_object(
        &self,
        request: HeadObjectRequest,
    ) -> Result<HeadObjectResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let output = self
            .client
            .head_object()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "head object failed"))?;

        let content_length = output
            .content_length()
            .unwrap_or_default()
            .try_into()
            .unwrap_or(0_u64);
        Ok(HeadObjectResponse {
            locator: request.locator,
            content_length,
            content_type: output.content_type().map(str::to_string),
            etag: output.e_tag().map(str::to_string),
            version_id: output.version_id().map(str::to_string),
            checksum_sha256_hex: output.checksum_sha256().map(str::to_string),
            metadata: Self::metadata_to_btree(output.metadata()),
        })
    }

    async fn delete_object(
        &self,
        request: DeleteObjectRequest,
    ) -> Result<DeleteObjectResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        self.client
            .delete_object()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "delete object failed"))?;

        Ok(DeleteObjectResponse {
            locator: request.locator,
            deleted: true,
        })
    }

    async fn create_multipart_upload(
        &self,
        request: CreateMultipartUploadRequest,
    ) -> Result<CreateMultipartUploadResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let mut builder = self
            .client
            .create_multipart_upload()
            .bucket(bucket)
            .key(request.locator.object_key.clone());

        if let Some(content_type) = request.content_type {
            builder = builder.content_type(content_type);
        }
        for (key, value) in request.metadata {
            builder = builder.metadata(key, value);
        }

        let output = builder
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "create multipart upload failed"))?;
        let upload_id = output.upload_id().ok_or_else(|| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::UpstreamError,
                "create multipart upload returned no upload_id",
            )
        })?;

        Ok(CreateMultipartUploadResponse {
            locator: request.locator,
            upload_id: upload_id.to_string(),
        })
    }

    async fn presign_upload_part(
        &self,
        request: PresignUploadPartRequest,
    ) -> Result<PresignedUploadPartResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let presigning_config = PresigningConfig::expires_in(Duration::from_secs(u64::from(
            request.expires_in_seconds,
        )))
        .map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                format!("invalid presign expiry: {error}"),
            )
        })?;
        let presigned = self
            .client
            .upload_part()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .upload_id(request.upload_id)
            .part_number(i32::from(request.part_number))
            .presigned(presigning_config)
            .await
            .map_err(|error| Self::map_sdk_error(error, "presign upload part failed"))?;

        Ok(PresignedUploadPartResponse {
            method: presigned.method().to_string(),
            url: presigned.uri().to_string(),
            headers: Self::headers_from_presigned(&presigned),
            expires_at_epoch_ms: Self::expires_at_epoch_ms(request.expires_in_seconds),
        })
    }

    async fn complete_multipart_upload(
        &self,
        request: CompleteMultipartUploadRequest,
    ) -> Result<CompleteMultipartUploadResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let completed_parts: Vec<CompletedPart> = request
            .parts
            .into_iter()
            .map(|part| {
                CompletedPart::builder()
                    .part_number(i32::from(part.part_number))
                    .e_tag(part.etag)
                    .build()
            })
            .collect();
        let completed_upload = CompletedMultipartUpload::builder()
            .set_parts(Some(completed_parts))
            .build();

        let output = self
            .client
            .complete_multipart_upload()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .upload_id(request.upload_id)
            .multipart_upload(completed_upload)
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "complete multipart upload failed"))?;

        Ok(CompleteMultipartUploadResponse {
            locator: request.locator,
            etag: output.e_tag().map(str::to_string),
            version_id: output.version_id().map(str::to_string),
        })
    }

    async fn abort_multipart_upload(
        &self,
        request: AbortMultipartUploadRequest,
    ) -> Result<(), DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        self.client
            .abort_multipart_upload()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .upload_id(request.upload_id)
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "abort multipart upload failed"))?;
        Ok(())
    }

    async fn presign_download(
        &self,
        request: PresignDownloadRequest,
    ) -> Result<PresignedDownloadResponse, DriveObjectStoreError> {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let presigning_config = PresigningConfig::expires_in(Duration::from_secs(u64::from(
            request.expires_in_seconds,
        )))
        .map_err(|error| {
            DriveObjectStoreError::new(
                DriveObjectStoreErrorKind::InvalidRequest,
                format!("invalid presign expiry: {error}"),
            )
        })?;
        let presigned = self
            .client
            .get_object()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .presigned(presigning_config)
            .await
            .map_err(|error| Self::map_sdk_error(error, "presign download failed"))?;

        Ok(PresignedDownloadResponse {
            method: presigned.method().to_string(),
            url: presigned.uri().to_string(),
            headers: Self::headers_from_presigned(&presigned),
            expires_at_epoch_ms: Self::expires_at_epoch_ms(request.expires_in_seconds),
        })
    }

    async fn read_object_range(
        &self,
        request: ReadObjectRangeRequest,
    ) -> Result<(ReadObjectRangeResponse, Box<dyn DriveObjectChunkStream>), DriveObjectStoreError>
    {
        let bucket = self.resolve_bucket(&request.locator.bucket);
        let range_value = format!(
            "bytes={}-{}",
            request.range.start_inclusive, request.range.end_inclusive
        );
        let output = self
            .client
            .get_object()
            .bucket(bucket)
            .key(request.locator.object_key.clone())
            .range(range_value)
            .send()
            .await
            .map_err(|error| Self::map_sdk_error(error, "read object range failed"))?;

        let content_type = output.content_type().map(str::to_string);
        let etag = output.e_tag().map(str::to_string);
        let bytes = output
            .body
            .collect()
            .await
            .map_err(|error| {
                DriveObjectStoreError::new(
                    DriveObjectStoreErrorKind::UpstreamError,
                    format!("read object body failed: {error}"),
                )
            })?
            .into_bytes()
            .to_vec();
        let content_length = bytes.len() as u64;
        let stream: Box<dyn DriveObjectChunkStream> =
            Box::new(SingleChunkStream { body: Some(bytes) });

        Ok((
            ReadObjectRangeResponse {
                locator: request.locator,
                content_type,
                etag,
                content_length,
            },
            stream,
        ))
    }
}
