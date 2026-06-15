use crate::dto::{ListSpacesQuery, QuotaQuery, QuotaResponse, SpaceListResponse};
use crate::error::{map_service_error, ProblemDetail};
use crate::mappers::map_space;
use crate::state::BackendState;
use crate::validators::require_tenant_id;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::application::quota_service::{
    DriveQuotaService, GetTenantQuotaSummaryCommand,
};
use sdkwork_drive_workspace_service::application::space_service::{
    DriveSpaceService, ListSpacesCommand,
};
use sdkwork_drive_workspace_service::infrastructure::sql::quota_store::SqlQuotaStore;
use sdkwork_drive_workspace_service::infrastructure::sql::space_store::SqlSpaceStore;

pub(crate) async fn list_spaces(
    State(state): State<BackendState>,
    Query(query): Query<ListSpacesQuery>,
) -> Result<Json<SpaceListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_service_error)?;
    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool));
    let items = service
        .list_spaces(ListSpacesCommand {
            tenant_id,
            owner_subject_type: query.owner_subject_type,
            owner_subject_id: query.owner_subject_id,
        })
        .await
        .map_err(map_service_error)?;

    Ok(Json(SpaceListResponse {
        items: items.into_iter().map(map_space).collect(),
    }))
}

pub(crate) async fn list_quotas(
    State(state): State<BackendState>,
    Query(query): Query<QuotaQuery>,
) -> Result<Json<QuotaResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_service_error)?;
    let service = DriveQuotaService::new(SqlQuotaStore::new(state.pool));
    let summary = service
        .get_tenant_quota_summary(GetTenantQuotaSummaryCommand { tenant_id })
        .await
        .map_err(map_service_error)?;

    Ok(Json(QuotaResponse {
        tenant_id: summary.tenant_id,
        total_bytes: summary.total_bytes,
        object_count: summary.object_count,
    }))
}
