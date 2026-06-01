use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sdkwork_drive_observability::{elapsed_ms, error_kinds, events, has_value, start_timer};
use sdkwork_drive_product::application::audit_service::{
    DriveAuditService, ListAuditEventsCommand, RecordAuditEventCommand,
};
use sdkwork_drive_product::application::maintenance_service::{
    DriveMaintenanceService, ListMaintenanceJobsCommand, SweepObjectStoreCommand,
    SweepUploadSessionsCommand,
};
use sdkwork_drive_product::application::quota_service::{
    DriveQuotaService, GetTenantQuotaSummaryCommand,
};
use sdkwork_drive_product::application::space_service::{DriveSpaceService, ListSpacesCommand};
use sdkwork_drive_product::application::storage_provider_service::{
    CreateStorageProviderCommand, DeleteStorageProviderCommand, DriveStorageProviderService,
    ListStorageProvidersCommand, TestStorageProviderCommand, UpdateStorageProviderCommand,
};
use sdkwork_drive_product::domain::space::DriveSpace;
use sdkwork_drive_product::domain::storage_provider::DriveStorageProvider;
use sdkwork_drive_product::domain::storage_provider::DriveStorageProviderKind;
use sdkwork_drive_product::infrastructure::sql::audit_store::SqlAuditStore;
use sdkwork_drive_product::infrastructure::sql::install_sqlite_schema;
use sdkwork_drive_product::infrastructure::sql::maintenance_store::SqlMaintenanceStore;
use sdkwork_drive_product::infrastructure::sql::quota_store::SqlQuotaStore;
use sdkwork_drive_product::infrastructure::sql::space_store::SqlSpaceStore;
use sdkwork_drive_product::infrastructure::sql::storage_provider_store::SqlStorageProviderStore;
use sdkwork_drive_product::DriveProductError;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

#[derive(Debug, Clone)]
pub struct AdminState {
    pool: SqlitePool,
}

impl AdminState {
    fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

pub fn build_router() -> Router {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_lazy(":memory:")
        .expect("create in-memory sqlite pool for admin api");
    build_router_with_state(AdminState::new(pool))
}

pub fn build_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    build_router_with_state(AdminState::new(pool))
}

pub async fn build_router_with_sqlite_database_url(
    database_url: &str,
) -> Result<Router, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;
    install_sqlite_schema(&pool).await?;
    Ok(build_router_with_state(AdminState::new(pool)))
}

fn build_router_with_state(state: AdminState) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route(
            "/backend/v3/api/drive/storage_providers",
            get(list_storage_providers).post(create_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/:provider_id",
            patch(update_storage_provider).delete(delete_storage_provider),
        )
        .route(
            "/backend/v3/api/drive/storage_providers/:provider_id/test",
            post(test_storage_provider),
        )
        .route("/backend/v3/api/drive/audit_events", get(list_audit_events))
        .route(
            "/backend/v3/api/drive/maintenance/object_sweep",
            post(sweep_object_store),
        )
        .route(
            "/backend/v3/api/drive/maintenance/upload_session_sweep",
            post(sweep_upload_sessions),
        )
        .route(
            "/backend/v3/api/drive/maintenance/jobs",
            get(list_maintenance_jobs),
        )
        .route("/backend/v3/api/drive/spaces", get(list_spaces))
        .route("/backend/v3/api/drive/quotas", get(list_quotas))
        .with_state(state)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateStorageProviderRequest {
    id: String,
    provider_kind: String,
    name: String,
    endpoint_url: String,
    region: Option<String>,
    bucket: String,
    path_style: Option<bool>,
    credential_ref: Option<String>,
    server_side_encryption_mode: Option<String>,
    default_storage_class: Option<String>,
    status: Option<String>,
    operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListStorageProvidersQuery {
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateStorageProviderRequest {
    name: Option<String>,
    endpoint_url: Option<String>,
    region: Option<String>,
    bucket: Option<String>,
    path_style: Option<bool>,
    credential_ref: Option<String>,
    server_side_encryption_mode: Option<String>,
    default_storage_class: Option<String>,
    status: Option<String>,
    operator_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteStorageProviderQuery {
    operator_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TestStorageProviderRequest {
    operator_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageProviderResponse {
    id: String,
    provider_kind: String,
    name: String,
    endpoint_url: String,
    region: Option<String>,
    bucket: String,
    path_style: bool,
    credential_ref: Option<String>,
    server_side_encryption_mode: Option<String>,
    default_storage_class: Option<String>,
    status: String,
    version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageProviderListResponse {
    items: Vec<StorageProviderResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TestStorageProviderResponse {
    provider_id: String,
    reachable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListAuditEventsQuery {
    tenant_id: Option<String>,
    action: Option<String>,
    resource_type: Option<String>,
    resource_id: Option<String>,
    request_id: Option<String>,
    trace_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuditEventItemResponse {
    id: i64,
    tenant_id: String,
    action: String,
    resource_type: String,
    resource_id: String,
    operator_id: String,
    request_id: Option<String>,
    trace_id: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuditEventPageResponse {
    items: Vec<AuditEventItemResponse>,
    page: u32,
    page_size: u32,
    total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SweepObjectStoreRequest {
    dry_run: bool,
    limit: Option<i64>,
    operator_id: String,
    request_id: Option<String>,
    trace_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SweepUploadSessionsRequest {
    now_epoch_ms: i64,
    dry_run: bool,
    limit: Option<i64>,
    operator_id: String,
    request_id: Option<String>,
    trace_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SweepResponse {
    scanned_count: i64,
    affected_count: i64,
    dry_run: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListMaintenanceJobsQuery {
    job_type: Option<String>,
    status: Option<String>,
    operator_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MaintenanceJobItemResponse {
    id: i64,
    job_type: String,
    status: String,
    dry_run: bool,
    scanned_count: i64,
    affected_count: i64,
    operator_id: String,
    request_id: Option<String>,
    trace_id: Option<String>,
    error_message: Option<String>,
    started_at: String,
    finished_at: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MaintenanceJobPageResponse {
    items: Vec<MaintenanceJobItemResponse>,
    page: u32,
    page_size: u32,
    total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListSpacesQuery {
    tenant_id: Option<String>,
    owner_subject_type: Option<String>,
    owner_subject_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpaceResponse {
    id: String,
    tenant_id: String,
    owner_subject_type: String,
    owner_subject_id: String,
    display_name: String,
    space_type: String,
    lifecycle_status: String,
    version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpaceListResponse {
    items: Vec<SpaceResponse>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuotaQuery {
    tenant_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QuotaResponse {
    tenant_id: String,
    total_bytes: i64,
    object_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProblemDetail {
    r#type: String,
    title: String,
    status: u16,
    detail: String,
    code: String,
    trace_id: String,
    request_id: String,
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok", "service": "sdkwork-drive-admin-api" }))
}

async fn list_storage_providers(
    State(state): State<AdminState>,
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

async fn create_storage_provider(
    State(state): State<AdminState>,
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

async fn update_storage_provider(
    State(state): State<AdminState>,
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

async fn test_storage_provider(
    State(state): State<AdminState>,
    Path(provider_id): Path<String>,
    Json(payload): Json<TestStorageProviderRequest>,
) -> Result<Json<TestStorageProviderResponse>, (StatusCode, Json<ProblemDetail>)> {
    let service =
        DriveStorageProviderService::new(SqlStorageProviderStore::new(state.pool.clone()));
    let tested = service
        .test_storage_provider(TestStorageProviderCommand {
            provider_id: provider_id.clone(),
        })
        .await
        .map_err(map_product_error)?;
    record_storage_provider_audit(
        &state,
        "storage_provider.tested",
        &provider_id,
        &payload.operator_id,
    )
    .await?;
    Ok(Json(TestStorageProviderResponse {
        provider_id: tested.provider_id,
        reachable: tested.reachable,
    }))
}

async fn delete_storage_provider(
    State(state): State<AdminState>,
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

async fn list_audit_events(
    State(state): State<AdminState>,
    Query(query): Query<ListAuditEventsQuery>,
) -> Result<Json<AuditEventPageResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let filter_has_tenant_id = has_value(&query.tenant_id);
    let filter_has_action = has_value(&query.action);
    let filter_has_resource_type = has_value(&query.resource_type);
    let filter_has_resource_id = has_value(&query.resource_id);
    let filter_has_request_id = has_value(&query.request_id);
    let filter_has_trace_id = has_value(&query.trace_id);
    let service = DriveAuditService::new(SqlAuditStore::new(state.pool));
    let page_result = service
        .list_events(ListAuditEventsCommand {
            tenant_id: query.tenant_id,
            action: query.action,
            resource_type: query.resource_type,
            resource_id: query.resource_id,
            request_id: query.request_id,
            trace_id: query.trace_id,
            page: query.page,
            page_size: query.page_size,
        })
        .await;
    let page = match page_result {
        Ok(page) => page,
        Err(error) => {
            let latency_ms = elapsed_ms(started);
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_AUDIT_EVENTS_LIST,
                result = "err",
                latency_ms = latency_ms,
                error_kind = product_error_kind(&error),
                filter_has_tenant_id = filter_has_tenant_id,
                filter_has_action = filter_has_action,
                filter_has_resource_type = filter_has_resource_type,
                filter_has_resource_id = filter_has_resource_id,
                filter_has_request_id = filter_has_request_id,
                filter_has_trace_id = filter_has_trace_id
            );
            return Err(map_product_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::ADMIN_AUDIT_EVENTS_LIST,
        result = "ok",
        latency_ms = latency_ms,
        filter_has_tenant_id = filter_has_tenant_id,
        filter_has_action = filter_has_action,
        filter_has_resource_type = filter_has_resource_type,
        filter_has_resource_id = filter_has_resource_id,
        filter_has_request_id = filter_has_request_id,
        filter_has_trace_id = filter_has_trace_id,
        page = page.page,
        page_size = page.page_size,
        total = page.total,
        returned_items = page.items.len() as u64
    );

    Ok(Json(AuditEventPageResponse {
        items: page
            .items
            .into_iter()
            .map(|item| AuditEventItemResponse {
                id: item.id,
                tenant_id: item.tenant_id,
                action: item.action,
                resource_type: item.resource_type,
                resource_id: item.resource_id,
                operator_id: item.operator_id,
                request_id: item.request_id,
                trace_id: item.trace_id,
                created_at: item.created_at,
            })
            .collect(),
        page: page.page,
        page_size: page.page_size,
        total: page.total,
    }))
}

async fn sweep_object_store(
    State(state): State<AdminState>,
    Json(payload): Json<SweepObjectStoreRequest>,
) -> Result<Json<SweepResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(state.pool.clone()));
    let result = service
        .sweep_object_store(SweepObjectStoreCommand {
            dry_run: payload.dry_run,
            limit: payload.limit,
            operator_id: payload.operator_id.clone(),
            request_id: payload.request_id.clone(),
            trace_id: payload.trace_id.clone(),
        })
        .await;

    match result {
        Ok(result) => {
            let latency_ms = elapsed_ms(started);
            record_maintenance_audit(
                &state,
                "maintenance.object_sweep.executed",
                &payload.operator_id,
                payload.request_id.clone(),
                payload.trace_id.clone(),
            )
            .await?;
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_MAINTENANCE_OBJECT_SWEEP,
                result = "ok",
                latency_ms = latency_ms,
                dry_run = result.dry_run,
                limit = payload.limit.unwrap_or(200),
                operator_id = payload.operator_id.as_str(),
                has_request_id = payload.request_id.is_some(),
                has_trace_id = payload.trace_id.is_some(),
                scanned_count = result.scanned_count,
                affected_count = result.affected_count
            );

            Ok(Json(SweepResponse {
                scanned_count: result.scanned_count,
                affected_count: result.affected_count,
                dry_run: result.dry_run,
            }))
        }
        Err(error) => {
            let latency_ms = elapsed_ms(started);
            let error_kind = product_error_kind(&error);
            let _ = record_maintenance_audit(
                &state,
                "maintenance.object_sweep.failed",
                &payload.operator_id,
                payload.request_id.clone(),
                payload.trace_id.clone(),
            )
            .await;
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_MAINTENANCE_OBJECT_SWEEP,
                result = "err",
                latency_ms = latency_ms,
                error_kind = error_kind,
                dry_run = payload.dry_run,
                limit = payload.limit.unwrap_or(200),
                operator_id = payload.operator_id.as_str(),
                has_request_id = payload.request_id.is_some(),
                has_trace_id = payload.trace_id.is_some()
            );
            Err(map_product_error(error))
        }
    }
}

async fn sweep_upload_sessions(
    State(state): State<AdminState>,
    Json(payload): Json<SweepUploadSessionsRequest>,
) -> Result<Json<SweepResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(state.pool.clone()));
    let result = service
        .sweep_upload_sessions(SweepUploadSessionsCommand {
            now_epoch_ms: payload.now_epoch_ms,
            dry_run: payload.dry_run,
            limit: payload.limit,
            operator_id: payload.operator_id.clone(),
            request_id: payload.request_id.clone(),
            trace_id: payload.trace_id.clone(),
        })
        .await;

    match result {
        Ok(result) => {
            let latency_ms = elapsed_ms(started);
            record_maintenance_audit(
                &state,
                "maintenance.upload_session_sweep.executed",
                &payload.operator_id,
                payload.request_id.clone(),
                payload.trace_id.clone(),
            )
            .await?;
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_MAINTENANCE_UPLOAD_SESSION_SWEEP,
                result = "ok",
                latency_ms = latency_ms,
                now_epoch_ms = payload.now_epoch_ms,
                dry_run = result.dry_run,
                limit = payload.limit.unwrap_or(200),
                operator_id = payload.operator_id.as_str(),
                has_request_id = payload.request_id.is_some(),
                has_trace_id = payload.trace_id.is_some(),
                scanned_count = result.scanned_count,
                affected_count = result.affected_count
            );

            Ok(Json(SweepResponse {
                scanned_count: result.scanned_count,
                affected_count: result.affected_count,
                dry_run: result.dry_run,
            }))
        }
        Err(error) => {
            let latency_ms = elapsed_ms(started);
            let error_kind = product_error_kind(&error);
            let _ = record_maintenance_audit(
                &state,
                "maintenance.upload_session_sweep.failed",
                &payload.operator_id,
                payload.request_id.clone(),
                payload.trace_id.clone(),
            )
            .await;
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_MAINTENANCE_UPLOAD_SESSION_SWEEP,
                result = "err",
                latency_ms = latency_ms,
                error_kind = error_kind,
                now_epoch_ms = payload.now_epoch_ms,
                dry_run = payload.dry_run,
                limit = payload.limit.unwrap_or(200),
                operator_id = payload.operator_id.as_str(),
                has_request_id = payload.request_id.is_some(),
                has_trace_id = payload.trace_id.is_some()
            );
            Err(map_product_error(error))
        }
    }
}

async fn list_maintenance_jobs(
    State(state): State<AdminState>,
    Query(query): Query<ListMaintenanceJobsQuery>,
) -> Result<Json<MaintenanceJobPageResponse>, (StatusCode, Json<ProblemDetail>)> {
    let started = start_timer();
    let filter_has_job_type = has_value(&query.job_type);
    let filter_has_status = has_value(&query.status);
    let filter_has_operator_id = has_value(&query.operator_id);
    let service = DriveMaintenanceService::new(SqlMaintenanceStore::new(state.pool));
    let page_result = service
        .list_maintenance_jobs(ListMaintenanceJobsCommand {
            job_type: query.job_type,
            status: query.status,
            operator_id: query.operator_id,
            page: query.page,
            page_size: query.page_size,
        })
        .await;
    let page = match page_result {
        Ok(page) => page,
        Err(error) => {
            let latency_ms = elapsed_ms(started);
            sdkwork_drive_observability::observe_route!(
                event = events::ADMIN_MAINTENANCE_JOBS_LIST,
                result = "err",
                latency_ms = latency_ms,
                error_kind = product_error_kind(&error),
                filter_has_job_type = filter_has_job_type,
                filter_has_status = filter_has_status,
                filter_has_operator_id = filter_has_operator_id
            );
            return Err(map_product_error(error));
        }
    };
    let latency_ms = elapsed_ms(started);
    sdkwork_drive_observability::observe_route!(
        event = events::ADMIN_MAINTENANCE_JOBS_LIST,
        result = "ok",
        latency_ms = latency_ms,
        filter_has_job_type = filter_has_job_type,
        filter_has_status = filter_has_status,
        filter_has_operator_id = filter_has_operator_id,
        page = page.page,
        page_size = page.page_size,
        total = page.total,
        returned_items = page.items.len() as u64
    );

    Ok(Json(MaintenanceJobPageResponse {
        items: page
            .items
            .into_iter()
            .map(|item| MaintenanceJobItemResponse {
                id: item.id,
                job_type: item.job_type,
                status: item.status,
                dry_run: item.dry_run,
                scanned_count: item.scanned_count,
                affected_count: item.affected_count,
                operator_id: item.operator_id,
                request_id: item.request_id,
                trace_id: item.trace_id,
                error_message: item.error_message,
                started_at: item.started_at,
                finished_at: item.finished_at,
                created_at: item.created_at,
            })
            .collect(),
        page: page.page,
        page_size: page.page_size,
        total: page.total,
    }))
}

async fn list_spaces(
    State(state): State<AdminState>,
    Query(query): Query<ListSpacesQuery>,
) -> Result<Json<SpaceListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    let service = DriveSpaceService::new(SqlSpaceStore::new(state.pool));
    let items = service
        .list_spaces(ListSpacesCommand {
            tenant_id,
            owner_subject_type: query.owner_subject_type,
            owner_subject_id: query.owner_subject_id,
        })
        .await
        .map_err(map_product_error)?;

    Ok(Json(SpaceListResponse {
        items: items.into_iter().map(map_space).collect(),
    }))
}

async fn list_quotas(
    State(state): State<AdminState>,
    Query(query): Query<QuotaQuery>,
) -> Result<Json<QuotaResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    let service = DriveQuotaService::new(SqlQuotaStore::new(state.pool));
    let summary = service
        .get_tenant_quota_summary(GetTenantQuotaSummaryCommand { tenant_id })
        .await
        .map_err(map_product_error)?;

    Ok(Json(QuotaResponse {
        tenant_id: summary.tenant_id,
        total_bytes: summary.total_bytes,
        object_count: summary.object_count,
    }))
}

fn map_storage_provider(provider: DriveStorageProvider) -> StorageProviderResponse {
    StorageProviderResponse {
        id: provider.id,
        provider_kind: provider.provider_kind.as_str().to_string(),
        name: provider.name,
        endpoint_url: provider.endpoint_url,
        region: provider.region,
        bucket: provider.bucket,
        path_style: provider.path_style,
        credential_ref: provider.credential_ref,
        server_side_encryption_mode: provider.server_side_encryption_mode,
        default_storage_class: provider.default_storage_class,
        status: provider.status,
        version: provider.version,
    }
}

async fn record_storage_provider_audit(
    state: &AdminState,
    action: &str,
    provider_id: &str,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    record_audit_event(
        state,
        action,
        "storage_provider",
        provider_id,
        operator_id,
        Some("request-unset".to_string()),
        Some("trace-unset".to_string()),
    )
    .await
}

async fn record_maintenance_audit(
    state: &AdminState,
    action: &str,
    operator_id: &str,
    request_id: Option<String>,
    trace_id: Option<String>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    record_audit_event(
        state,
        action,
        "maintenance",
        "maintenance",
        operator_id,
        request_id,
        trace_id,
    )
    .await
}

async fn record_audit_event(
    state: &AdminState,
    action: &str,
    resource_type: &str,
    resource_id: &str,
    operator_id: &str,
    request_id: Option<String>,
    trace_id: Option<String>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let audit_service = DriveAuditService::new(SqlAuditStore::new(state.pool.clone()));
    audit_service
        .record_event(RecordAuditEventCommand {
            tenant_id: "platform".to_string(),
            action: action.to_string(),
            resource_type: resource_type.to_string(),
            resource_id: resource_id.to_string(),
            operator_id: operator_id.to_string(),
            request_id: request_id.or_else(|| Some("request-unset".to_string())),
            trace_id: trace_id.or_else(|| Some("trace-unset".to_string())),
        })
        .await
        .map_err(map_product_error)?;
    Ok(())
}

fn require_tenant_id(tenant_id: Option<String>) -> Result<String, DriveProductError> {
    let tenant_id = tenant_id
        .ok_or_else(|| DriveProductError::Validation("tenant_id is required".to_string()))?
        .trim()
        .to_string();
    if tenant_id.is_empty() {
        return Err(DriveProductError::Validation(
            "tenant_id is required".to_string(),
        ));
    }
    Ok(tenant_id)
}

fn map_space(space: DriveSpace) -> SpaceResponse {
    SpaceResponse {
        id: space.id,
        tenant_id: space.tenant_id,
        owner_subject_type: space.owner_subject_type,
        owner_subject_id: space.owner_subject_id,
        display_name: space.display_name,
        space_type: space.space_type.as_str().to_string(),
        lifecycle_status: space.lifecycle_status,
        version: space.version,
    }
}

fn map_product_error(error: DriveProductError) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveProductError::Validation(detail) => {
            let code = if detail.starts_with("provider_kind is invalid;") {
                "drive.validation.provider_kind_invalid"
            } else {
                "drive.validation.failed"
            };
            problem(StatusCode::BAD_REQUEST, "validation failed", detail, code)
        }
        DriveProductError::Conflict(detail) => {
            problem(StatusCode::CONFLICT, "conflict", detail, "drive.conflict")
        }
        DriveProductError::NotFound(detail) => problem(
            StatusCode::NOT_FOUND,
            "not found",
            detail,
            "drive.not_found",
        ),
        DriveProductError::PermissionDenied(detail) => problem(
            StatusCode::FORBIDDEN,
            "permission denied",
            detail,
            "drive.permission_denied",
        ),
        DriveProductError::Internal(detail) => problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal error",
            detail,
            "drive.internal_error",
        ),
    }
}

fn parse_storage_provider_kind(raw: &str) -> Result<DriveStorageProviderKind, DriveProductError> {
    DriveStorageProviderKind::try_from_str(raw).ok_or_else(|| {
        DriveProductError::Validation(
            "provider_kind is invalid; allowed: local_filesystem, s3_compatible, azure_blob, google_cloud_storage, aliyun_oss, or custom:<vendor_key>"
                .to_string(),
        )
    })
}

fn product_error_kind(error: &DriveProductError) -> &'static str {
    match error {
        DriveProductError::Validation(_) => error_kinds::VALIDATION,
        DriveProductError::Conflict(_) => error_kinds::CONFLICT,
        DriveProductError::NotFound(_) => error_kinds::NOT_FOUND,
        DriveProductError::PermissionDenied(_) => error_kinds::PERMISSION_DENIED,
        DriveProductError::Internal(_) => error_kinds::INTERNAL,
    }
}

fn problem(
    status: StatusCode,
    title: &str,
    detail: impl Into<String>,
    code: &str,
) -> (StatusCode, Json<ProblemDetail>) {
    (
        status,
        Json(ProblemDetail {
            r#type: "about:blank".to_string(),
            title: title.to_string(),
            status: status.as_u16(),
            detail: detail.into(),
            code: code.to_string(),
            trace_id: "trace-unset".to_string(),
            request_id: "request-unset".to_string(),
        }),
    )
}
