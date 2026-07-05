use crate::audit::record_storage_provider_audit;
use crate::dto::{
    ListProviderBucketsQuery, OperatorQuery, ProviderBucketListItemResponse,
    ProviderBucketMutationResponse, ProviderBucketResponse,
};
use crate::error::{map_object_store_route_error, ProblemDetail};
use crate::object_store::build_full_s3_object_store_for_provider;
use crate::provider_lookup::get_active_provider;
use crate::response::{success_list_page_simple, StorageListHttpResponse};
use crate::state::AdminStorageState;
use crate::validators::{next_page_token, parse_offset_page, require_query_operator_id};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_contract::drive::domain_events::admin_audit;
use sdkwork_drive_storage_contract::{
    CreateBucketRequest, DeleteBucketRequest, DriveObjectStore, HeadBucketRequest,
    ListBucketsRequest,
};

pub(crate) async fn head_storage_provider_bucket(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
) -> Result<Json<ProviderBucketResponse>, (StatusCode, Json<ProblemDetail>)> {
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_full_s3_object_store_for_provider(&provider).await?;
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

pub(crate) async fn list_storage_provider_buckets(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Query(query): Query<ListProviderBucketsQuery>,
) -> Result<StorageListHttpResponse<ProviderBucketListItemResponse>, (StatusCode, Json<ProblemDetail>)>
{
    let page = parse_offset_page(query.page_size, query.page_token)?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let configured_bucket = provider.bucket.clone();
    let object_store = build_full_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .list_buckets(ListBucketsRequest)
        .await
        .map_err(map_object_store_route_error)?;
    let all_items: Vec<ProviderBucketListItemResponse> = result
        .items
        .into_iter()
        .map(|item| ProviderBucketListItemResponse {
            configured: item.bucket == configured_bucket,
            bucket: item.bucket,
            creation_date_epoch_ms: item.creation_date_epoch_ms,
        })
        .collect();
    let start = page.offset as usize;
    let take = (page.limit as usize).saturating_add(1);
    let end = (start + take).min(all_items.len());
    let mut items = if start >= all_items.len() {
        Vec::new()
    } else {
        all_items[start..end].to_vec()
    };
    let next_page_token = next_page_token(&mut items, page);
    Ok(success_list_page_simple(items, page, next_page_token))
}

pub(crate) async fn create_storage_provider_bucket(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Query(query): Query<OperatorQuery>,
) -> Result<Json<ProviderBucketMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = require_query_operator_id(query.operator_id)?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_full_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .create_bucket(CreateBucketRequest {
            bucket: provider.bucket.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::BUCKET_CREATED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(ProviderBucketMutationResponse {
        provider_id,
        bucket: result.bucket,
        changed: result.created,
    }))
}

pub(crate) async fn delete_storage_provider_bucket(
    State(state): State<AdminStorageState>,
    Path(provider_id): Path<String>,
    Query(query): Query<OperatorQuery>,
) -> Result<Json<ProviderBucketMutationResponse>, (StatusCode, Json<ProblemDetail>)> {
    let operator_id = require_query_operator_id(query.operator_id)?;
    let provider = get_active_provider(&state, &provider_id).await?;
    let object_store = build_full_s3_object_store_for_provider(&provider).await?;
    let result = object_store
        .delete_bucket(DeleteBucketRequest {
            bucket: provider.bucket.clone(),
        })
        .await
        .map_err(map_object_store_route_error)?;
    record_storage_provider_audit(
        &state,
        admin_audit::storage_provider::BUCKET_DELETED,
        &provider_id,
        &operator_id,
    )
    .await?;
    Ok(Json(ProviderBucketMutationResponse {
        provider_id,
        bucket: result.bucket,
        changed: result.deleted,
    }))
}
