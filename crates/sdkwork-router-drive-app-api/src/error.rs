use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_observability::error_kinds;
use sdkwork_drive_storage_contract::{DriveObjectStoreError, DriveObjectStoreErrorKind};
use sdkwork_drive_workspace_service::DriveServiceError;
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProblemDetail {
    r#type: String,
    title: String,
    status: u16,
    detail: String,
    code: String,
    trace_id: String,
    request_id: String,
}

pub(crate) fn map_service_error(error: DriveServiceError) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveServiceError::Validation(detail) => {
            let code = if detail.starts_with("provider_kind is invalid;") {
                "drive.validation.provider_kind_invalid"
            } else {
                "drive.validation.failed"
            };
            problem(StatusCode::BAD_REQUEST, "validation failed", detail, code)
        }
        DriveServiceError::Conflict(detail) => {
            problem(StatusCode::CONFLICT, "conflict", detail, "drive.conflict")
        }
        DriveServiceError::NotFound(detail) => problem(
            StatusCode::NOT_FOUND,
            "not found",
            detail,
            "drive.not_found",
        ),
        DriveServiceError::PermissionDenied(detail) => problem(
            StatusCode::FORBIDDEN,
            "permission denied",
            detail,
            "drive.permission_denied",
        ),
        DriveServiceError::Internal(detail) => problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal error",
            detail,
            "drive.internal_error",
        ),
    }
}

pub(crate) fn map_download_token_error(
    error: DriveServiceError,
) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveServiceError::NotFound(detail) if detail.contains("expired") => problem(
            StatusCode::GONE,
            "download token expired",
            detail,
            "drive.download_token.expired",
        ),
        other => map_service_error(other),
    }
}

pub(crate) fn internal_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::INTERNAL_SERVER_ERROR,
        "internal error",
        detail,
        "drive.internal_error",
    )
}

pub(crate) fn internal_sql_error(
    prefix: &'static str,
) -> impl Fn(sqlx::Error) -> (StatusCode, Json<ProblemDetail>) {
    move |error| internal_problem(format!("{prefix}: {error}"))
}

pub(crate) fn is_unique_constraint_error(error: &sqlx::Error) -> bool {
    let message = error.to_string();
    message.contains("UNIQUE constraint failed")
        || message.contains("duplicate key value violates unique constraint")
}

pub(crate) fn unique_node_insert_conflict_target(error: &sqlx::Error) -> &'static str {
    if !is_unique_constraint_error(error) {
        return "unknown";
    }

    let message = error.to_string();
    if message.contains("dr_drive_node_pkey")
        || message.contains("ux_dr_drive_node_pkey")
        || (message.contains("UNIQUE constraint failed: dr_drive_node.id")
            || message.contains("unique constraint \"dr_drive_node_pkey\""))
    {
        return "id";
    }

    if message.contains("ux_dr_drive_node_root_name_live")
        || message.contains("ux_dr_drive_node_child_name_live")
    {
        return "name";
    }

    if message.contains("parent_node_id") || message.contains("node_name") {
        return "name";
    }

    "unknown"
}

pub(crate) fn not_found_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::NOT_FOUND,
        "not found",
        detail,
        "drive.not_found",
    )
}

pub(crate) fn validation_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        detail,
        "drive.validation.failed",
    )
}

pub(crate) fn service_error_kind(error: &DriveServiceError) -> &'static str {
    match error {
        DriveServiceError::Validation(_) => error_kinds::VALIDATION,
        DriveServiceError::Conflict(_) => error_kinds::CONFLICT,
        DriveServiceError::NotFound(_) => error_kinds::NOT_FOUND,
        DriveServiceError::PermissionDenied(_) => error_kinds::PERMISSION_DENIED,
        DriveServiceError::Internal(_) => error_kinds::INTERNAL,
    }
}

pub(crate) fn problem(
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

pub(crate) fn map_object_store_error(error: DriveObjectStoreError) -> DriveServiceError {
    match error.kind {
        DriveObjectStoreErrorKind::NotFound => DriveServiceError::NotFound(error.message),
        DriveObjectStoreErrorKind::InvalidRequest => DriveServiceError::Validation(error.message),
        DriveObjectStoreErrorKind::Conflict => DriveServiceError::Conflict(error.message),
        DriveObjectStoreErrorKind::PermissionDenied => {
            DriveServiceError::PermissionDenied(error.message)
        }
        _ => DriveServiceError::Internal(error.message),
    }
}

pub(crate) fn map_object_store_route_error(
    error: DriveObjectStoreError,
) -> (StatusCode, Json<ProblemDetail>) {
    map_service_error(map_object_store_error(error))
}
