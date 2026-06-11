use crate::audit::record_audit_event;
use crate::dto::{
    DefaultStorageProviderBindingQuery, SetDefaultStorageProviderBindingRequest,
    StorageProviderBindingResponse,
};
use crate::error::{map_product_error, not_found_binding_problem, ProblemDetail};
use crate::mappers::map_storage_provider;
use crate::state::BackendState;
use crate::validators::{
    default_storage_provider_binding_id, normalize_optional_text, normalize_storage_root_prefix,
    require_tenant_id,
};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::application::storage_provider_service::{
    DriveStorageProviderService, GetStorageProviderCommand,
};
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_product::DriveProductError;
use sqlx::Row;

pub(crate) async fn get_default_storage_provider_binding(
    State(state): State<BackendState>,
    Query(query): Query<DefaultStorageProviderBindingQuery>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    let space_id = normalize_optional_text(query.space_id);
    let binding = find_default_storage_provider_binding(&state, &tenant_id, space_id.as_deref())
        .await?
        .ok_or_else(|| not_found_binding_problem())?;
    Ok(Json(binding))
}

pub(crate) async fn set_default_storage_provider_binding(
    State(state): State<BackendState>,
    Json(payload): Json<SetDefaultStorageProviderBindingRequest>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = payload.tenant_id.trim().to_string();
    if tenant_id.is_empty() {
        return Err(map_product_error(DriveProductError::Validation(
            "tenant_id is required".to_string(),
        )));
    }
    let provider_id = payload.provider_id.trim().to_string();
    if provider_id.is_empty() {
        return Err(map_product_error(DriveProductError::Validation(
            "provider_id is required".to_string(),
        )));
    }
    if payload.operator_id.trim().is_empty() {
        return Err(map_product_error(DriveProductError::Validation(
            "operator_id is required".to_string(),
        )));
    }
    let space_id = normalize_optional_text(payload.space_id);
    let storage_root_prefix = normalize_storage_root_prefix(
        payload.storage_root_prefix,
        &tenant_id,
        space_id.as_deref(),
    )?;
    let binding_scope = if space_id.is_some() {
        "space"
    } else {
        "tenant"
    };
    let binding_id = default_storage_provider_binding_id(&tenant_id, space_id.as_deref());

    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let provider = service
        .get_storage_provider(GetStorageProviderCommand {
            provider_id: provider_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    if provider.status != "active" {
        return Err(map_product_error(DriveProductError::Conflict(
            "default storage provider must be active".to_string(),
        )));
    }
    if let Some(space_id_value) = space_id.as_deref() {
        validate_space_exists(&state, &tenant_id, space_id_value).await?;
    }

    sqlx::query(
        "INSERT INTO dr_drive_storage_provider_binding (
            id, tenant_id, space_id, provider_id, binding_scope, purpose,
            storage_root_prefix, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, 'primary', $6, 'active', 1, $7, $7)
         ON CONFLICT(id) DO UPDATE SET
            provider_id=excluded.provider_id,
            binding_scope=excluded.binding_scope,
            storage_root_prefix=excluded.storage_root_prefix,
            lifecycle_status='active',
            version=dr_drive_storage_provider_binding.version + 1,
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP",
    )
    .bind(&binding_id)
    .bind(&tenant_id)
    .bind(space_id.as_deref())
    .bind(&provider_id)
    .bind(binding_scope)
    .bind(&storage_root_prefix)
    .bind(payload.operator_id.trim())
    .execute(&state.pool)
    .await
    .map_err(|error| {
        map_product_error(DriveProductError::Internal(format!(
            "upsert dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;

    let binding = find_default_storage_provider_binding(&state, &tenant_id, space_id.as_deref())
        .await?
        .ok_or_else(|| not_found_binding_problem())?;
    let audit_resource_id = space_id.as_deref().unwrap_or(tenant_id.as_str());
    record_audit_event(
        &state,
        "storage_provider_binding.default_set",
        "storage_provider_binding",
        audit_resource_id,
        payload.operator_id.trim(),
        Some("request-unset".to_string()),
        Some("trace-unset".to_string()),
    )
    .await?;
    Ok(Json(binding))
}

pub(crate) async fn validate_space_exists(
    state: &BackendState,
    tenant_id: &str,
    space_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_space
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|error| {
        map_product_error(DriveProductError::Internal(format!(
            "validate dr_drive_space failed: {error}"
        )))
    })?;
    if count == 0 {
        return Err(map_product_error(DriveProductError::NotFound(
            "space not found".to_string(),
        )));
    }
    Ok(())
}

pub(crate) async fn find_default_storage_provider_binding(
    state: &BackendState,
    tenant_id: &str,
    space_id: Option<&str>,
) -> Result<Option<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let rows = if let Some(space_id_value) = space_id {
        sqlx::query(
            "SELECT id, tenant_id, space_id, provider_id, binding_scope, purpose,
                    storage_root_prefix, lifecycle_status, version
             FROM dr_drive_storage_provider_binding
             WHERE tenant_id=$1
               AND space_id=$2
               AND purpose='primary'
               AND lifecycle_status='active'
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(space_id_value)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, tenant_id, space_id, provider_id, binding_scope, purpose,
                    storage_root_prefix, lifecycle_status, version
             FROM dr_drive_storage_provider_binding
             WHERE tenant_id=$1
               AND space_id IS NULL
               AND purpose='primary'
               AND lifecycle_status='active'
             LIMIT 1",
        )
        .bind(tenant_id)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(|error| {
        map_product_error(DriveProductError::Internal(format!(
            "find dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;

    let Some(row) = rows.first() else {
        return Ok(None);
    };
    let provider_id: String = row.get("provider_id");
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let provider = service
        .get_storage_provider(GetStorageProviderCommand {
            provider_id: provider_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    Ok(Some(StorageProviderBindingResponse {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        provider_id,
        binding_scope: row.get("binding_scope"),
        purpose: row.get("purpose"),
        storage_root_prefix: row.get("storage_root_prefix"),
        lifecycle_status: row.get("lifecycle_status"),
        version: row.get("version"),
        storage_provider: map_storage_provider(provider),
    }))
}
