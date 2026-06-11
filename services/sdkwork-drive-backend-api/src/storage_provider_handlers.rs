use crate::audit::record_storage_provider_audit;
use crate::dto::*;
use crate::error::{map_object_store_route_error, map_product_error, ProblemDetail};
use crate::mappers::{map_storage_provider, map_storage_provider_capabilities};
use crate::object_store::{
    build_s3_object_store_for_provider, get_storage_provider_for_operation, load_storage_provider,
    provider_supports_s3_object_store,
};
use crate::state::BackendState;
use crate::validators::{
    decode_object_key, parse_storage_provider_kind, validate_object_delimiter, validate_object_key,
    validate_object_prefix, validate_page_size_u16,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::application::storage_provider_service::{
    CreateStorageProviderCommand, DeleteStorageProviderCommand, DriveStorageProviderService,
    GetStorageProviderCommand, ListStorageProvidersCommand, RotateStorageProviderCredentialCommand,
    SetStorageProviderStatusCommand, StorageProviderCapabilitiesCommand,
    TestStorageProviderCommand, UpdateStorageProviderCommand,
};
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_product::DriveProductError;
use sdkwork_drive_storage_contract::{
    CopyObjectRequest, CreateBucketRequest, DeleteBucketRequest, DeleteObjectRequest,
    DriveObjectLocator, DriveObjectStore, HeadBucketRequest, HeadObjectRequest, ListObjectsRequest,
};
use serde_json::json;

pub(crate) async fn list_storage_providers(
    State(state): State<BackendState>,
    Query(query): Query<ListStorageProvidersQuery>,
) -> Result<Json<StorageProviderListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let items = service
        .list_storage_providers(ListStorageProvidersCommand {
            status: query.status,
        })
        .await
        .map_err(map_product_error)?;

    Ok(Json(StorageProviderListResponse {
        items: items.into_iter().map(map_storage_provider).collect(),
    }))
}

pub(crate) async fn get_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let provider = service
        .get_storage_provider(GetStorageProviderCommand {
            provider_id: provider_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.read",
        &provider_id,
        "operator-unset",
    )
    .await?;
    Ok(Json(map_storage_provider(provider)))
}

pub(crate) async fn create_storage_provider(
    State(state): State<BackendState>,
    Json(payload): Json<CreateStorageProviderRequest>,
) -> Result<(StatusCode, Json<StorageProviderResponse>), (StatusCode, Json<ProblemDetail>)> {
    let operator_id = payload.operator_id.clone();
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let created = service
        .create_storage_provider(CreateStorageProviderCommand {
            id: payload.id,
            provider_kind: parse_storage_provider_kind(&payload.provider_kind)
                .map_err(map_product_error)?,
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
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.created",
        &created.id,
        &operator_id,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(map_storage_provider(created))))
}

pub(crate) async fn update_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<UpdateStorageProviderRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
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
            operator_id: payload.operator_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.updated",
        &updated.id,
        &payload.operator_id,
    )
    .await?;
    Ok(Json(map_storage_provider(updated)))
}

pub(crate) async fn get_storage_provider_capabilities(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
) -> Result<Json<StorageProviderCapabilitiesResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let capabilities = service
        .get_storage_provider_capabilities(StorageProviderCapabilitiesCommand { provider_id })
        .await
        .map_err(map_product_error)?;
    Ok(Json(map_storage_provider_capabilities(capabilities)))
}

pub(crate) async fn activate_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<OperatorRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_storage_provider_status(state, provider_id, payload.operator_id, "active").await
}

pub(crate) async fn deactivate_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<OperatorRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_storage_provider_status(state, provider_id, payload.operator_id, "disabled").await
}

pub(crate) async fn rotate_storage_provider_credentials(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<RotateStorageProviderCredentialRequest>,
) -> Result<Json<StorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let updated = service
        .rotate_storage_provider_credential(RotateStorageProviderCredentialCommand {
            provider_id: provider_id.clone(),
            credential_ref: payload.credential_ref,
            operator_id: payload.operator_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.credentials_rotated",
        &provider_id,
        &payload.operator_id,
    )
    .await?;
    Ok(Json(map_storage_provider(updated)))
}

pub(crate) async fn head_storage_provider_bucket(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
) -> Result<Json<ProviderBucketResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .head_bucket(HeadBucketRequest {
            bucket: provider.bucket.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderBucketResponse {
        provider_id,
        bucket: result.bucket,
        exists: result.exists,
    }))
}

pub(crate) async fn create_storage_provider_bucket(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
) -> Result<Json<ProviderBucketMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .create_bucket(CreateBucketRequest {
            bucket: provider.bucket.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderBucketMutationResponse {
        provider_id,
        bucket: result.bucket,
        changed: result.created,
    }))
}

pub(crate) async fn delete_storage_provider_bucket(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
) -> Result<Json<ProviderBucketMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .delete_bucket(DeleteBucketRequest {
            bucket: provider.bucket.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderBucketMutationResponse {
        provider_id,
        bucket: result.bucket,
        changed: result.deleted,
    }))
}

pub(crate) async fn list_storage_provider_objects(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Query(query): Query<ListProviderObjectsQuery>,
) -> Result<Json<ProviderObjectListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let max_keys = validate_page_size_u16(query.page_size, 100, 1, 1000, "pageSize")?;
    let prefix = validate_object_prefix(query.prefix, "prefix")?;
    let delimiter = validate_object_delimiter(query.delimiter, "delimiter")?;
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .list_objects(ListObjectsRequest {
            bucket: provider.bucket.clone(),
            prefix,
            delimiter,
            continuation_token: query.page_token,
            max_keys,
        })
        .await
        .map_err(map_object_store_route_error)?;
    let items = result
        .items
        .into_iter()
        .map(|item| ProviderObjectResponse {
            provider_id: provider_id.clone(),
            bucket: result.bucket.clone(),
            object_key: item.object_key,
            content_length: item.content_length,
            content_type: None,
            etag: item.etag,
            version_id: None,
            storage_class: item.storage_class,
            last_modified_epoch_ms: item.last_modified_epoch_ms,
        })
        .collect();
    Ok(Json(ProviderObjectListResponse {
        provider_id,
        bucket: result.bucket,
        prefix: result.prefix,
        items,
        next_page_token: result.next_continuation_token,
    }))
}

pub(crate) async fn head_storage_provider_object(
    State(state): State<BackendState>,
    Path((provider_id, object_key)): Path<(String, String)>,
) -> Result<Json<ProviderObjectResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let object_key = decode_object_key(&object_key)?;
    let result = object_store
        .head_object(HeadObjectRequest {
            locator: DriveObjectLocator {
                bucket: provider.bucket.clone(),
                object_key,
            },
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderObjectResponse {
        provider_id,
        bucket: result.locator.bucket,
        object_key: result.locator.object_key,
        content_length: result.content_length,
        content_type: result.content_type,
        etag: result.etag,
        version_id: result.version_id,
        storage_class: None,
        last_modified_epoch_ms: None,
    }))
}

pub(crate) async fn delete_storage_provider_object(
    State(state): State<BackendState>,
    Path((provider_id, object_key)): Path<(String, String)>,
) -> Result<Json<ProviderObjectMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let object_key = decode_object_key(&object_key)?;
    let result = object_store
        .delete_object(DeleteObjectRequest {
            locator: DriveObjectLocator {
                bucket: provider.bucket.clone(),
                object_key,
            },
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderObjectMutationResponse {
        provider_id,
        bucket: result.locator.bucket,
        object_key: result.locator.object_key,
        changed: result.deleted,
    }))
}

pub(crate) async fn copy_storage_provider_object(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<CopyProviderObjectRequest>,
) -> Result<Json<ProviderObjectMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let source_key = validate_object_key(payload.source_object_key, "sourceObjectKey")?;
    let destination_key =
        validate_object_key(payload.destination_object_key, "destinationObjectKey")?;
    let provider = get_storage_provider_for_operation(&state, &provider_id).await?;
    let object_store = build_s3_object_store_for_provider(&provider).await?;
    let destination_bucket = payload
        .destination_bucket
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(provider.bucket.as_str())
        .to_string();
    let result = object_store
        .copy_object(CopyObjectRequest {
            source: DriveObjectLocator {
                bucket: provider.bucket.clone(),
                object_key: source_key,
            },
            destination: DriveObjectLocator {
                bucket: destination_bucket,
                object_key: destination_key,
            },
            metadata_directive: payload.metadata_directive,
        })
        .await
        .map_err(map_object_store_route_error)?;
    Ok(Json(ProviderObjectMutationResponse {
        provider_id,
        bucket: result.locator.bucket,
        object_key: result.locator.object_key,
        changed: true,
    }))
}

pub(crate) async fn set_storage_provider_status(
    state: BackendState,
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
        .map_err(map_product_error)?;
    let action = match status {
        "active" => "storage_provider.activated",
        "disabled" => "storage_provider.deactivated",
        _ => "storage_provider.status_changed",
    };
    record_storage_provider_audit(&state, action, &provider_id, &operator_id).await?;
    Ok(Json(map_storage_provider(updated)))
}

pub(crate) async fn test_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<TestStorageProviderRequest>,
) -> Result<Json<TestStorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = load_storage_provider(&state, &provider_id).await?;
    if provider.status == "deleted" {
        return Err(map_product_error(DriveProductError::Conflict(
            "deleted storage provider cannot be tested".to_string(),
        )));
    }
    if provider_supports_s3_object_store(&provider.provider_kind) {
        let object_store = build_s3_object_store_for_provider(&provider).await?;
        object_store
            .head_bucket(HeadBucketRequest {
                bucket: provider.bucket.clone(),
            })
            .await
            .map_err(map_object_store_route_error)?;
    } else {
        let service =
            DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
        service
            .test_storage_provider(TestStorageProviderCommand {
                provider_id: provider_id.clone(),
            })
            .await
            .map_err(map_product_error)?;
    }
    record_storage_provider_audit(
        &state,
        "storage_provider.tested",
        &provider_id,
        &payload.operator_id,
    )
    .await?;
    Ok(Json(TestStorageProviderResponse {
        provider_id: provider.id,
        reachable: true,
    }))
}

pub(crate) async fn delete_storage_provider(
    State(state): State<BackendState>,
    Path(provider_id): Path<String>,
    Query(query): Query<DeleteStorageProviderQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = query
        .operator_id
        .ok_or_else(|| DriveProductError::Validation("operator_id is required".to_string()))
        .map_err(map_product_error)?;
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let deleted = service
        .delete_storage_provider(DeleteStorageProviderCommand {
            provider_id: provider_id.clone(),
            operator_id: operator_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.deleted",
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(json!({ "deleted": deleted.deleted })))
}
