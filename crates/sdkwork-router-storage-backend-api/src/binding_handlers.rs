use crate::audit::record_audit_event;
use crate::dto::{
    DefaultStorageProviderBindingQuery, DeleteDefaultStorageProviderBindingQuery,
    DeleteStorageProviderBindingResponse, ListStorageProviderBindingsQuery,
    SetDefaultStorageProviderBindingRequest, StorageProviderBindingListResponse,
    StorageProviderBindingResponse,
};
use crate::error::{map_service_error, not_found_binding_problem, ProblemDetail};
use crate::provider_lookup::get_provider;
use crate::provider_mappers::map_storage_provider;
use crate::state::AdminStorageState;
use crate::validators::{
    default_storage_provider_binding_id, normalize_optional_text, normalize_storage_root_prefix,
    require_non_empty_text, require_query_operator_id, require_tenant_id,
    validate_storage_binding_lifecycle_status,
};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::domain::storage_provider::DriveStorageProvider;
use sdkwork_drive_workspace_service::DriveServiceError;
use sqlx::Row;

pub(crate) async fn get_default_storage_provider_binding(
    State(state): State<AdminStorageState>,
    Query(query): Query<DefaultStorageProviderBindingQuery>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_service_error)?;
    let space_id = normalize_optional_text(query.space_id);
    let binding = find_default_storage_provider_binding(&state, &tenant_id, space_id.as_deref())
        .await?
        .ok_or_else(not_found_binding_problem)?;
    Ok(Json(binding))
}

pub(crate) async fn list_storage_provider_bindings(
    State(state): State<AdminStorageState>,
    Query(query): Query<ListStorageProviderBindingsQuery>,
) -> Result<Json<StorageProviderBindingListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_service_error)?;
    let space_id = normalize_optional_text(query.space_id);
    let provider_id = normalize_optional_text(query.provider_id);
    let lifecycle_status =
        normalize_optional_text(query.lifecycle_status).unwrap_or_else(|| "active".to_string());
    validate_storage_binding_lifecycle_status(&lifecycle_status)?;

    let rows = sqlx::query(
        "SELECT id, tenant_id, space_id, provider_id, binding_scope, purpose,
                storage_root_prefix, lifecycle_status, version
         FROM dr_drive_storage_provider_binding
         WHERE tenant_id=$1
           AND lifecycle_status=$2
           AND purpose='primary'
           AND ($3 IS NULL OR space_id=$3)
           AND ($4 IS NULL OR provider_id=$4)
         ORDER BY
           CASE WHEN binding_scope='space' THEN 0 ELSE 1 END ASC,
           COALESCE(space_id, '') ASC,
           id ASC",
    )
    .bind(&tenant_id)
    .bind(&lifecycle_status)
    .bind(space_id.as_deref())
    .bind(provider_id.as_deref())
    .fetch_all(&state.pool)
    .await
    .map_err(|error| {
        map_service_error(DriveServiceError::Internal(format!(
            "list dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;

    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(map_storage_provider_binding_row(&state, &row).await?);
    }
    Ok(Json(StorageProviderBindingListResponse { items }))
}

pub(crate) async fn set_default_storage_provider_binding(
    State(state): State<AdminStorageState>,
    Json(payload): Json<SetDefaultStorageProviderBindingRequest>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_non_empty_text(payload.tenant_id, "tenantId")?;
    let provider_id = require_non_empty_text(payload.provider_id, "providerId")?;
    let operator_id = require_non_empty_text(payload.operator_id, "operatorId")?;
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
    let provider = get_provider(&state, &provider_id).await?;
    if provider.status != "active" {
        return Err(map_service_error(DriveServiceError::Conflict(
            "default storage provider must be active".to_string(),
        )));
    }
    if let Some(space_id_value) = space_id.as_deref() {
        validate_space_exists(&state, &tenant_id, space_id_value).await?;
    }
    let binding_id = default_storage_provider_binding_id(&tenant_id, space_id.as_deref());
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
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        map_service_error(DriveServiceError::Internal(format!(
            "upsert dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;
    let binding = find_default_storage_provider_binding(&state, &tenant_id, space_id.as_deref())
        .await?
        .ok_or_else(not_found_binding_problem)?;
    let audit_resource_id = space_id.as_deref().unwrap_or(tenant_id.as_str());
    record_audit_event(
        &state,
        "storage_provider_binding.default_set",
        "storage_provider_binding",
        audit_resource_id,
        &operator_id,
    )
    .await?;
    Ok(Json(binding))
}

pub(crate) async fn delete_default_storage_provider_binding(
    State(state): State<AdminStorageState>,
    Query(query): Query<DeleteDefaultStorageProviderBindingQuery>,
) -> Result<Json<DeleteStorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_service_error)?;
    let operator_id = require_query_operator_id(query.operator_id)?;
    let space_id = normalize_optional_text(query.space_id);
    let binding_id = default_storage_provider_binding_id(&tenant_id, space_id.as_deref());
    let result = sqlx::query(
        "UPDATE dr_drive_storage_provider_binding
         SET lifecycle_status='deleted',
             version=version + 1,
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP
         WHERE tenant_id=$2
           AND id=$3
           AND purpose='primary'
           AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&binding_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        map_service_error(DriveServiceError::Internal(format!(
            "delete dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;
    let deleted = result.rows_affected() > 0;
    if deleted {
        let audit_resource_id = space_id.as_deref().unwrap_or(tenant_id.as_str());
        record_audit_event(
            &state,
            "storage_provider_binding.default_deleted",
            "storage_provider_binding",
            audit_resource_id,
            &operator_id,
        )
        .await?;
    }
    Ok(Json(DeleteStorageProviderBindingResponse { deleted }))
}

pub(crate) async fn validate_space_exists(
    state: &AdminStorageState,
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
        map_service_error(DriveServiceError::Internal(format!(
            "validate dr_drive_space failed: {error}"
        )))
    })?;
    if count == 0 {
        return Err(map_service_error(DriveServiceError::NotFound(
            "space not found".to_string(),
        )));
    }
    Ok(())
}

pub(crate) async fn find_default_storage_provider_binding(
    state: &AdminStorageState,
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
        map_service_error(DriveServiceError::Internal(format!(
            "find dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;

    let Some(row) = rows.first() else {
        return Ok(None);
    };
    let provider_id: String = row.get("provider_id");
    let provider = get_provider(state, &provider_id).await?;
    Ok(Some(map_storage_provider_binding_row_with_provider(
        row, provider,
    )))
}

pub(crate) async fn map_storage_provider_binding_row(
    state: &AdminStorageState,
    row: &sqlx::any::AnyRow,
) -> Result<StorageProviderBindingResponse, (StatusCode, Json<ProblemDetail>)> {
    let provider_id: String = row.get("provider_id");
    let provider = get_provider(state, &provider_id).await?;
    Ok(map_storage_provider_binding_row_with_provider(
        row, provider,
    ))
}

fn map_storage_provider_binding_row_with_provider(
    row: &sqlx::any::AnyRow,
    provider: DriveStorageProvider,
) -> StorageProviderBindingResponse {
    StorageProviderBindingResponse {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        provider_id: provider.id.clone(),
        binding_scope: row.get("binding_scope"),
        purpose: row.get("purpose"),
        storage_root_prefix: row.get("storage_root_prefix"),
        lifecycle_status: row.get("lifecycle_status"),
        version: row.get("version"),
        storage_provider: map_storage_provider(provider),
    }
}
