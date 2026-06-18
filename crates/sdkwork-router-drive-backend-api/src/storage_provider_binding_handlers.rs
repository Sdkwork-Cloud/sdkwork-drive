use crate::audit::record_audit_event;
use crate::dto::{
    DefaultStorageProviderBindingQuery, SetDefaultStorageProviderBindingRequest,
    StorageProviderBindingResponse,
};
use crate::error::{map_service_error, not_found_binding_problem, ProblemDetail};
use crate::mappers::map_storage_provider;
use crate::state::BackendState;
use crate::tenant_context::authenticated_tenant_id;
use crate::validators::{
    default_storage_provider_binding_id, normalize_storage_root_prefix,
    resolve_storage_provider_binding_target, storage_provider_binding_purpose,
    storage_provider_binding_scope, StorageProviderBindingTarget,
};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Extension;
use axum::Json;
use sdkwork_drive_security::DriveAppContext;
use sdkwork_drive_workspace_service::application::storage_provider_service::{
    DriveStorageProviderService, GetStorageProviderCommand,
};
use sdkwork_drive_workspace_service::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_workspace_service::DriveServiceError;
use sqlx::Row;

pub(crate) async fn get_default_storage_provider_binding(
    State(state): State<BackendState>,
    Extension(app_context): Extension<DriveAppContext>,
    Query(query): Query<DefaultStorageProviderBindingQuery>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = authenticated_tenant_id(&app_context);
    let target = resolve_storage_provider_binding_target(query.space_id, query.space_type)?;
    let binding = find_storage_provider_binding(&state, &tenant_id, &target)
        .await?
        .ok_or_else(not_found_binding_problem)?;
    Ok(Json(binding))
}

pub(crate) async fn set_default_storage_provider_binding(
    State(state): State<BackendState>,
    Extension(app_context): Extension<DriveAppContext>,
    Json(payload): Json<SetDefaultStorageProviderBindingRequest>,
) -> Result<Json<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = authenticated_tenant_id(&app_context);
    let provider_id = payload.provider_id.trim().to_string();
    if provider_id.is_empty() {
        return Err(map_service_error(DriveServiceError::Validation(
            "provider_id is required".to_string(),
        )));
    }
    if payload.operator_id.trim().is_empty() {
        return Err(map_service_error(DriveServiceError::Validation(
            "operator_id is required".to_string(),
        )));
    }
    let target = resolve_storage_provider_binding_target(payload.space_id, payload.space_type)?;
    let storage_root_prefix =
        normalize_storage_root_prefix(payload.storage_root_prefix, &tenant_id, &target)?;
    let binding_scope = storage_provider_binding_scope(&target);
    let purpose = storage_provider_binding_purpose(&target);
    let binding_id = default_storage_provider_binding_id(&tenant_id, &target);

    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let provider = service
        .get_storage_provider(GetStorageProviderCommand {
            provider_id: provider_id.clone(),
        })
        .await
        .map_err(map_service_error)?;
    if provider.status != "active" {
        return Err(map_service_error(DriveServiceError::Conflict(
            "default storage provider must be active".to_string(),
        )));
    }
    if let StorageProviderBindingTarget::Space(space_id) = &target {
        validate_space_exists(&state, &tenant_id, space_id).await?;
    }

    let space_id = match &target {
        StorageProviderBindingTarget::Space(space_id) => Some(space_id.as_str()),
        _ => None,
    };
    sqlx::query(
        "INSERT INTO dr_drive_storage_provider_binding (
            id, tenant_id, space_id, provider_id, binding_scope, purpose,
            storage_root_prefix, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 1, $8, $8)
         ON CONFLICT(id) DO UPDATE SET
            provider_id=excluded.provider_id,
            binding_scope=excluded.binding_scope,
            purpose=excluded.purpose,
            storage_root_prefix=excluded.storage_root_prefix,
            lifecycle_status='active',
            version=dr_drive_storage_provider_binding.version + 1,
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP",
    )
    .bind(&binding_id)
    .bind(&tenant_id)
    .bind(space_id)
    .bind(&provider_id)
    .bind(binding_scope)
    .bind(&purpose)
    .bind(&storage_root_prefix)
    .bind(payload.operator_id.trim())
    .execute(&state.pool)
    .await
    .map_err(|error| {
        map_service_error(DriveServiceError::Internal(format!(
            "upsert dr_drive_storage_provider_binding failed: {error}"
        )))
    })?;

    let binding = find_storage_provider_binding(&state, &tenant_id, &target)
        .await?
        .ok_or_else(not_found_binding_problem)?;
    let audit_resource_id = match &target {
        StorageProviderBindingTarget::Tenant => tenant_id.as_str(),
        StorageProviderBindingTarget::Space(space_id) => space_id,
        StorageProviderBindingTarget::SpaceType(space_type) => space_type,
    };
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

async fn find_storage_provider_binding(
    state: &BackendState,
    tenant_id: &str,
    target: &StorageProviderBindingTarget,
) -> Result<Option<StorageProviderBindingResponse>, (StatusCode, Json<ProblemDetail>)> {
    let binding_id = default_storage_provider_binding_id(tenant_id, target);
    let rows = sqlx::query(
        "SELECT id, tenant_id, space_id, provider_id, binding_scope, purpose,
                storage_root_prefix, lifecycle_status, version
         FROM dr_drive_storage_provider_binding
         WHERE tenant_id=$1
           AND id=$2
           AND lifecycle_status='active'
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(&binding_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| {
        map_service_error(DriveServiceError::Internal(format!(
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
        .map_err(map_service_error)?;
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
