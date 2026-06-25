use crate::audit::record_storage_provider_audit;
use sdkwork_drive_contract::drive::domain_events::admin_audit;
use crate::dto::{
    CopyProviderObjectRequest, ListProviderObjectsQuery, OperatorQuery, ProviderObjectListResponse,
    ProviderObjectMutationResponse, ProviderObjectResponse,
};
use crate::error::{map_object_store_route_error, ProblemDetail};
use crate::object_store::build_object_store_for_provider;
use crate::provider_lookup::get_active_provider;
use crate::state::AdminStorageState;
use crate::validators::{
    decode_object_key, require_query_operator_id, validate_object_delimiter, validate_object_key,
    validate_object_prefix, validate_page_size_u16,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_storage_contract::{
    validate_s3_bucket_name, CopyObjectRequest, DeleteObjectRequest, DriveObjectLocator,
    HeadObjectRequest, ListObjectsRequest,
};

pub(crate) async fn list_storage_provider_objects(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Query(query): Query<ListProviderObjectsQuery>,
) -> Result<Json<ProviderObjectListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let max_keys = validate_page_size_u16(query.page_size, 100, 1, 1000, "pageSize")?;
    let prefix = validate_object_prefix(query.prefix, "prefix")?;
    let delimiter = validate_object_delimiter(query.delimiter, "delimiter")?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_object_store_for_provider(&state.config, &provider).await?;
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
    State(state): State<AdminStorageState>,
    Path((provider_id, object_key)): Path<(String, String)>,
) -> Result<Json<ProviderObjectResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_object_store_for_provider(&state.config, &provider).await?;
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
    State(state): State<AdminStorageState>,
    Path((provider_id, object_key)): Path<(String, String)>,
    Query(query): Query<OperatorQuery>,
) -> Result<Json<ProviderObjectMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = require_query_operator_id(query.operator_id)?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_object_store_for_provider(&state.config, &provider).await?;
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
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::OBJECT_DELETED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(ProviderObjectMutationResponse {
        provider_id,
        bucket: result.locator.bucket,
        object_key: result.locator.object_key,
        changed: result.deleted,
    }))
}

pub(crate) async fn copy_storage_provider_object(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<CopyProviderObjectRequest>,
) -> Result<Json<ProviderObjectMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let source_key = validate_object_key(payload.source_object_key, "sourceObjectKey")?;
    let destination_key =
        validate_object_key(payload.destination_object_key, "destinationObjectKey")?;
    let operator_id = require_query_operator_id(payload.operator_id)?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_object_store_for_provider(&state.config, &provider).await?;
    let destination_bucket = match payload.destination_bucket.as_deref() {
        Some(value) if !value.trim().is_empty() => {
            validate_s3_bucket_name(value, "destinationBucket")
                .map_err(map_object_store_route_error)?;
            value.to_string()
        }
        _ => provider.bucket.clone(),
    };
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
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::OBJECT_COPIED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(ProviderObjectMutationResponse {
        provider_id,
        bucket: result.locator.bucket,
        object_key: result.locator.object_key,
        changed: true,
    }))
}
