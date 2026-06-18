use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateStorageProviderRequest {
    pub(crate) id: String,
    pub(crate) provider_kind: String,
    pub(crate) name: String,
    pub(crate) endpoint_url: String,
    pub(crate) region: Option<String>,
    pub(crate) bucket: String,
    pub(crate) path_style: Option<bool>,
    pub(crate) strict_tls: Option<bool>,
    pub(crate) credential_ref: Option<String>,
    pub(crate) server_side_encryption_mode: Option<String>,
    pub(crate) default_storage_class: Option<String>,
    pub(crate) status: Option<String>,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListStorageProvidersQuery {
    pub(crate) status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateStorageProviderRequest {
    pub(crate) name: Option<String>,
    pub(crate) endpoint_url: Option<String>,
    pub(crate) region: Option<String>,
    pub(crate) bucket: Option<String>,
    pub(crate) path_style: Option<bool>,
    pub(crate) strict_tls: Option<bool>,
    pub(crate) credential_ref: Option<String>,
    pub(crate) server_side_encryption_mode: Option<String>,
    pub(crate) default_storage_class: Option<String>,
    pub(crate) status: Option<String>,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OperatorRequest {
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RotateStorageProviderCredentialRequest {
    pub(crate) credential_ref: String,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DefaultStorageProviderBindingQuery {
    pub(crate) space_id: Option<String>,
    pub(crate) space_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetDefaultStorageProviderBindingRequest {
    pub(crate) space_id: Option<String>,
    pub(crate) space_type: Option<String>,
    pub(crate) provider_id: String,
    pub(crate) storage_root_prefix: Option<String>,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeleteStorageProviderQuery {
    pub(crate) operator_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TestStorageProviderRequest {
    pub(crate) operator_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StorageProviderResponse {
    pub(crate) id: String,
    pub(crate) provider_kind: String,
    pub(crate) name: String,
    pub(crate) endpoint_url: String,
    pub(crate) region: Option<String>,
    pub(crate) bucket: String,
    pub(crate) path_style: bool,
    pub(crate) strict_tls: bool,
    pub(crate) credential_ref: Option<String>,
    pub(crate) server_side_encryption_mode: Option<String>,
    pub(crate) default_storage_class: Option<String>,
    pub(crate) status: String,
    pub(crate) version: i64,
    pub(crate) credential_configured: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StorageProviderListResponse {
    pub(crate) items: Vec<StorageProviderResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TestStorageProviderResponse {
    pub(crate) provider_id: String,
    pub(crate) reachable: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StorageProviderCapabilitiesResponse {
    pub(crate) provider_id: String,
    pub(crate) provider_kind: String,
    pub(crate) supports_multipart_upload: bool,
    pub(crate) supports_presigned_upload_part: bool,
    pub(crate) supports_presigned_download: bool,
    pub(crate) supports_server_side_encryption: bool,
    pub(crate) supports_storage_class: bool,
    pub(crate) supports_credential_rotation: bool,
    pub(crate) supported_server_side_encryption_modes: Vec<String>,
    pub(crate) supported_storage_classes: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListProviderObjectsQuery {
    pub(crate) prefix: Option<String>,
    pub(crate) delimiter: Option<String>,
    pub(crate) page_token: Option<String>,
    pub(crate) page_size: Option<u16>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CopyProviderObjectRequest {
    pub(crate) source_object_key: String,
    pub(crate) destination_object_key: String,
    pub(crate) destination_bucket: Option<String>,
    pub(crate) metadata_directive: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderBucketResponse {
    pub(crate) provider_id: String,
    pub(crate) bucket: String,
    pub(crate) exists: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderBucketMutationResponse {
    pub(crate) provider_id: String,
    pub(crate) bucket: String,
    pub(crate) changed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderObjectResponse {
    pub(crate) provider_id: String,
    pub(crate) bucket: String,
    pub(crate) object_key: String,
    pub(crate) content_length: u64,
    pub(crate) content_type: Option<String>,
    pub(crate) etag: Option<String>,
    pub(crate) version_id: Option<String>,
    pub(crate) storage_class: Option<String>,
    pub(crate) last_modified_epoch_ms: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderObjectListResponse {
    pub(crate) provider_id: String,
    pub(crate) bucket: String,
    pub(crate) prefix: Option<String>,
    pub(crate) items: Vec<ProviderObjectResponse>,
    pub(crate) next_page_token: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderObjectMutationResponse {
    pub(crate) provider_id: String,
    pub(crate) bucket: String,
    pub(crate) object_key: String,
    pub(crate) changed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StorageProviderBindingResponse {
    pub(crate) id: String,
    pub(crate) tenant_id: String,
    pub(crate) space_id: Option<String>,
    pub(crate) provider_id: String,
    pub(crate) binding_scope: String,
    pub(crate) purpose: String,
    pub(crate) storage_root_prefix: String,
    pub(crate) lifecycle_status: String,
    pub(crate) version: i64,
    pub(crate) storage_provider: StorageProviderResponse,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateLabelRequest {
    pub(crate) id: String,
    pub(crate) label_key: String,
    pub(crate) display_name: String,
    pub(crate) color: Option<String>,
    pub(crate) description: Option<String>,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpdateLabelRequest {
    pub(crate) display_name: Option<String>,
    pub(crate) color: Option<String>,
    pub(crate) description: Option<String>,
    pub(crate) operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LabelListQuery {
    pub(crate) lifecycle_status: Option<String>,
    pub(crate) page_size: Option<i64>,
    pub(crate) page_token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LabelMutationQuery {
    pub(crate) operator_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LabelResponse {
    pub(crate) id: String,
    pub(crate) tenant_id: String,
    pub(crate) label_key: String,
    pub(crate) display_name: String,
    pub(crate) color: Option<String>,
    pub(crate) description: Option<String>,
    pub(crate) lifecycle_status: String,
    pub(crate) version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LabelListResponse {
    pub(crate) items: Vec<LabelResponse>,
    pub(crate) next_page_token: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeleteLabelResponse {
    pub(crate) deleted: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListAuditEventsQuery {
    pub(crate) action: Option<String>,
    pub(crate) resource_type: Option<String>,
    pub(crate) resource_id: Option<String>,
    pub(crate) request_id: Option<String>,
    pub(crate) trace_id: Option<String>,
    pub(crate) page: Option<u32>,
    pub(crate) page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AuditEventItemResponse {
    pub(crate) id: i64,
    pub(crate) tenant_id: String,
    pub(crate) action: String,
    pub(crate) resource_type: String,
    pub(crate) resource_id: String,
    pub(crate) operator_id: String,
    pub(crate) request_id: Option<String>,
    pub(crate) trace_id: Option<String>,
    pub(crate) created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AuditEventPageResponse {
    pub(crate) items: Vec<AuditEventItemResponse>,
    pub(crate) page: u32,
    pub(crate) page_size: u32,
    pub(crate) total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SweepObjectStoreRequest {
    pub(crate) dry_run: bool,
    pub(crate) limit: Option<i64>,
    pub(crate) operator_id: String,
    pub(crate) request_id: Option<String>,
    pub(crate) trace_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SweepUploadSessionsRequest {
    pub(crate) now_epoch_ms: i64,
    pub(crate) dry_run: bool,
    pub(crate) limit: Option<i64>,
    pub(crate) operator_id: String,
    pub(crate) request_id: Option<String>,
    pub(crate) trace_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SweepResponse {
    pub(crate) scanned_count: i64,
    pub(crate) affected_count: i64,
    pub(crate) dry_run: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListMaintenanceJobsQuery {
    pub(crate) job_type: Option<String>,
    pub(crate) status: Option<String>,
    pub(crate) operator_id: Option<String>,
    pub(crate) page: Option<u32>,
    pub(crate) page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MaintenanceJobItemResponse {
    pub(crate) id: i64,
    pub(crate) job_type: String,
    pub(crate) status: String,
    pub(crate) dry_run: bool,
    pub(crate) scanned_count: i64,
    pub(crate) affected_count: i64,
    pub(crate) operator_id: String,
    pub(crate) request_id: Option<String>,
    pub(crate) trace_id: Option<String>,
    pub(crate) error_message: Option<String>,
    pub(crate) started_at: String,
    pub(crate) finished_at: String,
    pub(crate) created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MaintenanceJobPageResponse {
    pub(crate) items: Vec<MaintenanceJobItemResponse>,
    pub(crate) page: u32,
    pub(crate) page_size: u32,
    pub(crate) total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListDownloadPackagesQuery {
    pub(crate) state: Option<String>,
    pub(crate) page: Option<u32>,
    pub(crate) page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DownloadPackageItemResponse {
    pub(crate) id: String,
    pub(crate) tenant_id: String,
    pub(crate) package_name: String,
    pub(crate) state: String,
    pub(crate) storage_provider_id: String,
    pub(crate) bucket: String,
    pub(crate) archive_object_key: String,
    pub(crate) content_type: String,
    pub(crate) file_count: i64,
    pub(crate) total_bytes: i64,
    pub(crate) archive_size_bytes: i64,
    pub(crate) expires_at_epoch_ms: i64,
    pub(crate) error_message: Option<String>,
    pub(crate) created_by: String,
    pub(crate) updated_by: String,
    pub(crate) created_at: String,
    pub(crate) updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DownloadPackagePageResponse {
    pub(crate) items: Vec<DownloadPackageItemResponse>,
    pub(crate) page: u32,
    pub(crate) page_size: u32,
    pub(crate) total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ListSpacesQuery {
    pub(crate) owner_subject_type: Option<String>,
    pub(crate) owner_subject_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SpaceResponse {
    pub(crate) id: String,
    pub(crate) tenant_id: String,
    pub(crate) owner_subject_type: String,
    pub(crate) owner_subject_id: String,
    pub(crate) display_name: String,
    pub(crate) space_type: String,
    pub(crate) lifecycle_status: String,
    pub(crate) version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SpaceListResponse {
    pub(crate) items: Vec<SpaceResponse>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct QuotaQuery {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct QuotaResponse {
    pub(crate) tenant_id: String,
    pub(crate) total_bytes: i64,
    pub(crate) object_count: i64,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct OffsetPage {
    pub(crate) limit: i64,
    pub(crate) offset: i64,
}
