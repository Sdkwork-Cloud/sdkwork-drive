use crate::error::{map_product_error, ProblemDetail};
use crate::state::AdminStorageState;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::application::storage_provider_service::{
    DriveStorageProviderService, GetStorageProviderCommand,
};
use sdkwork_drive_product::domain::storage_provider::DriveStorageProvider;
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_product::DriveProductError;

pub(crate) async fn get_provider(
    state: &AdminStorageState,
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

pub(crate) async fn get_active_provider(
    state: &AdminStorageState,
    provider_id: &str,
) -> Result<DriveStorageProvider, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_provider(state, provider_id).await?;
    if provider.status != "active" {
        return Err(map_product_error(DriveProductError::Conflict(
            "storage provider must be active for object store operations".to_string(),
        )));
    }
    Ok(provider)
}
