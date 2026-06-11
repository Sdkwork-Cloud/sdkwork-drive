use crate::error::{map_product_error, ProblemDetail};
use crate::state::BackendState;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::application::audit_service::{
    DriveAuditService, RecordAuditEventCommand,
};
use sdkwork_drive_product::infrastructure::sql::audit_store::SqlAuditStore;

pub(crate) async fn record_storage_provider_audit(
    state: &BackendState,
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

pub(crate) async fn record_label_audit(
    state: &BackendState,
    action: &str,
    label_id: &str,
    operator_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    record_audit_event(
        state,
        action,
        "label",
        label_id,
        operator_id,
        Some("request-unset".to_string()),
        Some("trace-unset".to_string()),
    )
    .await
}

pub(crate) async fn record_maintenance_audit(
    state: &BackendState,
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

pub(crate) async fn record_audit_event(
    state: &BackendState,
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
