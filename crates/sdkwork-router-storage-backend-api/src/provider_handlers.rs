use crate::audit::record_storage_provider_audit;
use sdkwork_drive_contract::drive::domain_events::admin_audit;
use crate::dto::*;
use crate::error::{map_object_store_route_error, map_service_error, ProblemDetail};
use crate::object_store::{
    build_full_s3_object_store_for_provider, provider_supports_s3_object_store,
};
use crate::provider_lookup::get_provider;
use crate::provider_mappers::{
    map_storage_provider, map_storage_provider_capabilities, parse_storage_provider_kind,
};
use crate::state::AdminStorageState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_storage_contract::{DriveObjectStore, HeadBucketRequest};
use sdkwork_drive_workspace_service::application::storage_provider_service::{
    CreateStorageProviderCommand, DeleteStorageProviderCommand, DriveStorageProviderService,
    ListStorageProvidersCommand, RotateStorageProviderCredentialCommand,
    SetStorageProviderStatusCommand, StorageProviderCapabilitiesCommand,
    TestStorageProviderCommand, UpdateStorageProviderCommand,
};
use sdkwork_drive_workspace_service::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_workspace_service::DriveServiceError;
use serde_json::json;

pub(crate) async fn list_storage_providers(
    State(state): State<AdminStorageState>,
    Query(query): Query<ListStorageProvidersQuery>,
) -> Result<Json<StorageProviderListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let providers = service
        .list_storage_providers(ListStorageProvidersCommand {
            status: query.status,
        })
        .await
        .map_err(map_service_error)?;
    Ok(Json(StorageProviderListResponse {
        items: providers.into_iter().map(map_storage_provider).collect(),
    }))
}

pub(crate) async fn create_storage_provider(
    State(state): State<AdminStorageState>,
    Json(payload): Json<CreateStorageProviderRequest>,
) -> Result<(StatusCode, Json<StorageProviderResponse>), (StatusCode, Json<ProblemDetail>)> {
    let operator_id = payload.operator_id.clone();
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let provider_kind =
        parse_storage_provider_kind(&payload.provider_kind).map_err(map_service_error)?;
    let created = service
        .create_storage_provider(CreateStorageProviderCommand {
            id: payload.id,
            provider_kind,
            name: payload.name,
            endpoint_url: payload.endpoint_url,
            region: payload.region,
            bucket: payload.bucket,
            path_style: payload.path_style,
            strict_tls: payload.strict_tls,
            credential_ref: payload.credential_ref,
            server_side_encryption_mode: payload.server_side_encryption_mode,
            default_storage_class: payload.default_storage_class,
            status: payload.status,
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::CREATED,
        &created.id,
        &operator_id,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(map_storage_provider(created))))
}

pub(crate) async fn get_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_provider(&state, &provider_id).await?;
    Ok(Json(map_storage_provider(provider)))
}

pub(crate) async fn update_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<UpdateStorageProviderRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = payload.operator_id.clone();
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let updated = service
        .update_storage_provider(UpdateStorageProviderCommand {
            provider_id,
            name: payload.name,
            endpoint_url: payload.endpoint_url,
            region: payload.region,
            bucket: payload.bucket,
            path_style: payload.path_style,
            strict_tls: payload.strict_tls,
            credential_ref: payload.credential_ref,
            server_side_encryption_mode: payload.server_side_encryption_mode,
            default_storage_class: payload.default_storage_class,
            status: payload.status,
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::UPDATED,
        &updated.id,
        &operator_id,
    )
    .await?;
    Ok(Json(map_storage_provider(updated)))
}

pub(crate) async fn delete_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Query(query): Query<DeleteStorageProviderQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = query
        .operator_id
        .ok_or_else(|| DriveServiceError::Validation("operator_id is required".to_string()))
        .map_err(map_service_error)?;
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let deleted = service
        .delete_storage_provider(DeleteStorageProviderCommand {
            provider_id: provider_id.clone(),
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::DELETED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(json!({ "deleted": deleted.deleted })))
}

pub(crate) async fn get_storage_provider_capabilities(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
) -> Result<Json<StorageProviderCapabilitiesResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let capabilities = service
        .get_storage_provider_capabilities(StorageProviderCapabilitiesCommand { provider_id })
        .await
        .map_err(map_service_error)?;
    Ok(Json(map_storage_provider_capabilities(capabilities)))
}

pub(crate) async fn test_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<TestStorageProviderRequest>,
) -> Result<Json<TestStorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    if payload.operator_id.trim().is_empty() {
        return Err(map_service_error(DriveServiceError::Validation(
            "operator_id is required".to_string(),
        )));
    }
    let provider = get_provider(&state, &provider_id).await?;
    if provider.status == "deleted" {
        return Err(map_service_error(DriveServiceError::Conflict(
            "deleted storage provider cannot be tested".to_string(),
        )));
    }
    let reachable = if provider_supports_s3_object_store(&provider.provider_kind) {
        let object_store = build_full_s3_object_store_for_provider(&provider).await?;
        object_store
            .head_bucket(HeadBucketRequest {
                bucket: provider.bucket.clone(),
            })
            .await
            .map_err(map_object_store_route_error)?;
        true
    } else {
        let service =
            DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
        service
            .test_storage_provider(TestStorageProviderCommand {
                provider_id: provider_id.clone(),
            })
            .await
            .map_err(map_service_error)?
            .reachable
    };
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::TESTED,
        &provider_id,
        &payload.operator_id,
    )
    .await?;
    Ok(Json(TestStorageProviderResponse {
        provider_id: provider.id,
        reachable,
    }))
}

pub(crate) async fn activate_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<OperatorRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_storage_provider_status(state, provider_id, payload.operator_id, "active").await
}

pub(crate) async fn deactivate_storage_provider(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<OperatorRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_storage_provider_status(state, provider_id, payload.operator_id, "disabled").await
}

pub(crate) async fn rotate_storage_provider_credentials(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<RotateStorageProviderCredentialRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = payload.operator_id.clone();
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let updated = service
        .rotate_storage_provider_credential(RotateStorageProviderCredentialCommand {
            provider_id: provider_id.clone(),
            credential_ref: payload.credential_ref,
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::CREDENTIALS_ROTATED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(map_storage_provider(updated)))
}

pub(crate) async fn set_storage_provider_status(
    state: AdminStorageState,
    provider_id: String,
    operator_id: String,
    status: &str,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let updated = service
        .set_storage_provider_status(SetStorageProviderStatusCommand {
            provider_id: provider_id.clone(),
            status: status.to_string(),
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    let action = match status {
        "active" => admin_audit::storage_provider::ACTIVATED,
        "disabled" => admin_audit::storage_provider::DEACTIVATED,
        _ => admin_audit::storage_provider::STATUS_CHANGED,
    };
    record_storage_provider_audit(&state, action, &provider_id, &operator_id).await?;
    Ok(Json(map_storage_provider(updated)))
}
