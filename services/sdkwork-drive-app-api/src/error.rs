use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_observability::error_kinds;
use sdkwork_drive_product::DriveProductError;
use sdkwork_drive_security::DriveAuthError;
use sdkwork_drive_storage_contract::{DriveObjectStoreError, DriveObjectStoreErrorKind};
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

pub(crate) fn map_product_error(error: DriveProductError) -> (StatusCode, Json<ProblemDetail>) {
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

pub(crate) fn map_download_token_error(
    error: DriveProductError,
) -> (StatusCode, Json<ProblemDetail>) {
    match error {
        DriveProductError::NotFound(detail) if detail.contains("expired") => problem(
            StatusCode::GONE,
            "download token expired",
            detail,
            "drive.download_token.expired",
        ),
        other => map_product_error(other),
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

pub(crate) fn product_error_kind(error: &DriveProductError) -> &'static str {
    match error {
        DriveProductError::Validation(_) => error_kinds::VALIDATION,
        DriveProductError::Conflict(_) => error_kinds::CONFLICT,
        DriveProductError::NotFound(_) => error_kinds::NOT_FOUND,
        DriveProductError::PermissionDenied(_) => error_kinds::PERMISSION_DENIED,
        DriveProductError::Internal(_) => error_kinds::INTERNAL,
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

pub(crate) fn map_object_store_error(error: DriveObjectStoreError) -> DriveProductError {
    match error.kind {
        DriveObjectStoreErrorKind::NotFound => DriveProductError::NotFound(error.message),
        DriveObjectStoreErrorKind::InvalidRequest => DriveProductError::Validation(error.message),
        DriveObjectStoreErrorKind::Conflict => DriveProductError::Conflict(error.message),
        DriveObjectStoreErrorKind::PermissionDenied => {
            DriveProductError::PermissionDenied(error.message)
        }
        _ => DriveProductError::Internal(error.message),
    }
}

pub(crate) fn map_object_store_route_error(
    error: DriveObjectStoreError,
) -> (StatusCode, Json<ProblemDetail>) {
    map_product_error(map_object_store_error(error))
}
