use crate::error::{map_object_store_route_error, map_product_error, ProblemDetail};
use crate::state::BackendState;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::application::storage_provider_service::{
    DriveStorageProviderService, GetStorageProviderCommand,
};
use sdkwork_drive_product::domain::storage_provider::{
    DriveStorageProvider, DriveStorageProviderKind,
};
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_product::DriveProductError;
use sdkwork_drive_storage_s3::{S3DriveObjectStore, S3StoreConfig};

pub(crate) async fn get_storage_provider_for_operation(
    state: &BackendState,
    provider_id: &str,
) -> Result<DriveStorageProvider, (StatusCode, Json<ProblemDetail>)> {
    let provider = load_storage_provider(state, provider_id).await?;
    if provider.status != "active" {
        return Err(map_product_error(DriveProductError::Conflict(
            "storage provider must be active for object store operations".to_string(),
        )));
    }
    Ok(provider)
}

pub(crate) async fn load_storage_provider(
    state: &BackendState,
    provider_id: &str,
) -> Result<DriveStorageProvider, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    service
        .get_storage_provider(GetStorageProviderCommand {
            provider_id: provider_id.to_string(),
        })
        .await
        .map_err(map_product_error)
}

pub(crate) async fn build_s3_object_store_for_provider(
    provider: &DriveStorageProvider,
) -> Result<S3DriveObjectStore, (StatusCode, Json<ProblemDetail>)> {
    if !provider_supports_s3_object_store(&provider.provider_kind) {
        return Err(map_product_error(DriveProductError::Conflict(
            "storage provider does not support s3-compatible object store operations".to_string(),
        )));
    }

    S3DriveObjectStore::new(
        S3StoreConfig::from_provider_parts(
            provider.provider_kind.as_str(),
            &provider.endpoint_url,
            provider.region.as_deref(),
            &provider.bucket,
            provider.path_style,
            provider.credential_ref.as_deref(),
            Some(provider.strict_tls),
        )
        .map_err(map_object_store_route_error)?,
    )
    .await
    .map_err(map_object_store_route_error)
}

pub(crate) fn provider_supports_s3_object_store(provider_kind: &DriveStorageProviderKind) -> bool {
    matches!(
        provider_kind,
        DriveStorageProviderKind::S3Compatible
            | DriveStorageProviderKind::AliyunOss
            | DriveStorageProviderKind::TencentCos
            | DriveStorageProviderKind::HuaweiObs
            | DriveStorageProviderKind::VolcengineTos
            | DriveStorageProviderKind::GoogleCloudStorage
            | DriveStorageProviderKind::Custom(_)
    )
}
