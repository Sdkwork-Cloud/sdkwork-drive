use axum::http::StatusCode;
use axum::Json;
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

pub(crate) fn share_link_expired_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::GONE,
        "share link expired",
        "share link expired",
        "drive.share_link.expired",
    )
}

pub(crate) fn share_link_access_code_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::FORBIDDEN,
        "access code required",
        "share link access code is missing or invalid",
        "drive.share_link.access_code_invalid",
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
        problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal error",
            "An unexpected error occurred.",
            "drive.internal_error",
        )
    }
}

pub(crate) fn map_service_error(error: DriveServiceError) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveServiceError::Validation(detail) => problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            detail,
            "drive.validation.failed",
        ),
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
