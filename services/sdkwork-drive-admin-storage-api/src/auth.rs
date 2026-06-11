use crate::error::{map_auth_error, problem, ProblemDetail};
use crate::state::AdminStorageState;
use axum::body::{to_bytes, Body};
use axum::extract::State;
use axum::http::{header, Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use sdkwork_drive_security::{
    validate_drive_app_context, validate_json_context_projection, DriveAppContext,
    DriveAuthValidationPolicy,
};

const AUTH_CONTEXT_BODY_LIMIT_BYTES: usize = 1_048_576;

pub(crate) async fn app_context_guard(
    State(state): State<AdminStorageState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<ProblemDetail>)> {
    let context = validate_drive_app_context(request.headers(), request.uri(), &state.auth_policy)
        .map_err(map_auth_error)?;

    if request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json"))
    {
        let (parts, body) = request.into_parts();
        let bytes = to_bytes(body, AUTH_CONTEXT_BODY_LIMIT_BYTES)
            .await
            .map_err(|error| {
                problem(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "request body too large",
                    format!("request body could not be read: {error}"),
                    "drive.request.body_too_large",
                )
            })?;
        if !bytes.is_empty() {
            let body_json: serde_json::Value = serde_json::from_slice(&bytes).map_err(|error| {
                problem(
                    StatusCode::BAD_REQUEST,
                    "invalid request body",
                    format!("request body must be valid JSON: {error}"),
                    "drive.request.invalid_json",
                )
            })?;
            validate_json_context_projection(&body_json, &context).map_err(map_auth_error)?;
        }
        request = Request::from_parts(parts, Body::from(bytes));
    }

    request.extensions_mut().insert::<DriveAppContext>(context);
    Ok(next.run(request).await)
}

pub(crate) fn drive_auth_policy_from_env() -> DriveAuthValidationPolicy {
    if std::env::var("SDKWORK_DRIVE_IAM_ALLOW_UNSIGNED_CONTEXT")
        .map(|value| value.eq_ignore_ascii_case("true") || value == "1")
        .unwrap_or(false)
    {
        return DriveAuthValidationPolicy::allow_unsigned_for_development();
    }
    match std::env::var("SDKWORK_DRIVE_IAM_CONTEXT_SIGNATURE_SECRET") {
        Ok(secret) if !secret.trim().is_empty() => {
            DriveAuthValidationPolicy::require_signed_projection(secret)
        }
        _ => DriveAuthValidationPolicy::require_signed_projection(""),
    }
}
