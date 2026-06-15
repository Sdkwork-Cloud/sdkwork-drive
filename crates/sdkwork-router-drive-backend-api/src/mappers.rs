use crate::dto::{
    DownloadPackageItemResponse, LabelResponse, SpaceResponse, StorageProviderCapabilitiesResponse,
    StorageProviderResponse,
};
use sdkwork_drive_workspace_service::application::storage_provider_service::StorageProviderCapabilities;
use sdkwork_drive_workspace_service::domain::space::DriveSpace;
use sdkwork_drive_workspace_service::domain::storage_provider::DriveStorageProvider;
use sqlx::Row;

pub(crate) fn map_storage_provider(provider: DriveStorageProvider) -> StorageProviderResponse {
    let credential_configured = provider
        .credential_ref
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty());
    StorageProviderResponse {
        id: provider.id,
        provider_kind: provider.provider_kind.as_str().to_string(),
        name: provider.name,
        endpoint_url: provider.endpoint_url,
        region: provider.region,
        bucket: provider.bucket,
        path_style: provider.path_style,
        strict_tls: provider.strict_tls,
        credential_ref: provider.credential_ref.as_deref().map(mask_credential_ref),
        server_side_encryption_mode: provider.server_side_encryption_mode,
        default_storage_class: provider.default_storage_class,
        status: provider.status,
        version: provider.version,
        credential_configured,
    }
}

pub(crate) fn map_storage_provider_capabilities(
    capabilities: StorageProviderCapabilities,
) -> StorageProviderCapabilitiesResponse {
    StorageProviderCapabilitiesResponse {
        provider_id: capabilities.provider_id,
        provider_kind: capabilities.provider_kind,
        supports_multipart_upload: capabilities.supports_multipart_upload,
        supports_presigned_upload_part: capabilities.supports_presigned_upload_part,
        supports_presigned_download: capabilities.supports_presigned_download,
        supports_server_side_encryption: capabilities.supports_server_side_encryption,
        supports_storage_class: capabilities.supports_storage_class,
        supports_credential_rotation: capabilities.supports_credential_rotation,
        supported_server_side_encryption_modes: capabilities.supported_server_side_encryption_modes,
        supported_storage_classes: capabilities.supported_storage_classes,
    }
}

pub(crate) fn mask_credential_ref(value: &str) -> String {
    match value.split_once(':') {
        Some((prefix, _)) if !prefix.trim().is_empty() => format!("{}:***", prefix.trim()),
        _ => "***".to_string(),
    }
}

pub(crate) fn map_label_row(row: &sqlx::any::AnyRow) -> LabelResponse {
    LabelResponse {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        label_key: row.get("label_key"),
        display_name: row.get("display_name"),
        color: row.get("color"),
        description: row.get("description"),
        lifecycle_status: row.get("lifecycle_status"),
        version: row.get("version"),
    }
}

pub(crate) fn map_download_package_row(row: &sqlx::any::AnyRow) -> DownloadPackageItemResponse {
    DownloadPackageItemResponse {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        package_name: row.get("package_name"),
        state: row.get("state"),
        storage_provider_id: row.get("storage_provider_id"),
        bucket: row.get("bucket"),
        archive_object_key: row.get("archive_object_key"),
        content_type: row.get("content_type"),
        file_count: row.get("file_count"),
        total_bytes: row.get("total_bytes"),
        archive_size_bytes: row.get("archive_size_bytes"),
        expires_at_epoch_ms: row.get("expires_at_epoch_ms"),
        error_message: row.get("error_message"),
        created_by: row.get("created_by"),
        updated_by: row.get("updated_by"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

pub(crate) fn map_space(space: DriveSpace) -> SpaceResponse {
    SpaceResponse {
        id: space.id,
        tenant_id: space.tenant_id,
        owner_subject_type: space.owner_subject_type,
        owner_subject_id: space.owner_subject_id,
        display_name: space.display_name,
        space_type: space.space_type.as_str().to_string(),
        lifecycle_status: space.lifecycle_status,
        version: space.version,
    }
}
