use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_observability::error_kinds;
use sdkwork_drive_security::DriveAuthError;
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

pub(crate) fn validation_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        detail,
        "drive.validation.failed",
    )
}

pub(crate) fn internal_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    let detail = detail.into();
    tracing::error!(
        target: "sdkwork.drive",
        detail = %detail,
        "internal error response"
    );
    problem(
        StatusCode::INTERNAL_SERVER_ERROR,
        "internal error",
        "An unexpected error occurred.",
        "drive.internal_error",
    )
}

pub(crate) fn internal_sql_error(
    prefix: &'static str,
) -> impl Fn(sqlx::Error) -> (StatusCode, Json<ProblemDetail>) {
    move |error| {
        tracing::error!(
            target: "sdkwork.drive",
            prefix = prefix,
            error = %error,
            "database operation failed"
        );
        internal_problem("A database operation failed.")
    }
}

pub(crate) fn not_found_problem(detail: impl Into<String>) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::NOT_FOUND,
        "not found",
        detail,
        "drive.not_found",
    )
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
        DriveServiceError::Internal(detail) => {
            tracing::error!(
                target: "sdkwork.drive",
                detail = %detail,
                "internal drive service error"
            );
            problem(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal error",
                "An unexpected error occurred.",
                "drive.internal_error",
            )
        }
    }
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
    let ids = sdkwork_drive_http::problem_correlation::current_problem_correlation();
    (
        status,
        Json(ProblemDetail {
            r#type: "about:blank".to_string(),
            title: title.to_string(),
            status: status.as_u16(),
            detail: detail.into(),
            code: code.to_string(),
            trace_id: ids.trace_id,
            request_id: ids.request_id,
        }),
    )
}

pub(crate) fn map_auth_error(error: DriveAuthError) -> (StatusCode, Json<ProblemDetail>) {
    let status = StatusCode::from_u16(error.status).unwrap_or(StatusCode::UNAUTHORIZED);
    (
        status,
        Json(ProblemDetail {
            r#type: "about:blank".to_string(),
            title: error.title.to_string(),
            status: error.status,
            detail: error.detail,
            code: error.code.to_string(),
            trace_id: error.trace_id,
            request_id: error.request_id,
        }),
    )
}
