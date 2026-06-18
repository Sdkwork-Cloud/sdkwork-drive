use crate::error::{map_auth_error, problem, ProblemDetail};
use crate::state::AdminStorageState;
use axum::body::{to_bytes, Body};
use axum::extract::State;
use axum::http::{header, Request, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use sdkwork_drive_security::{
    can_access_drive_admin_storage, validate_drive_app_context, validate_json_context_projection,
    DriveAppContext, DriveAuthPolicyHandle,
};

const AUTH_CONTEXT_BODY_LIMIT_BYTES: usize = 1_048_576;

pub(crate) async fn app_context_guard(
    State(state): State<AdminStorageState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<ProblemDetail>)> {
    let context = state
        .auth_policy
        .read(|policy| validate_drive_app_context(request.headers(), request.uri(), policy))
        .map_err(map_auth_error)?;

    if !can_access_drive_admin_storage(&context) {
        return Err(map_auth_error(sdkwork_drive_security::DriveAuthError {
            status: 403,
            title: "forbidden",
            detail: "Drive storage admin permission is required".to_string(),
            code: "sdkwork.auth.missing_permission",
            request_id: context.request_id.clone(),
            trace_id: context.trace_id.clone(),
        }));
    }

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

pub(crate) fn drive_auth_policy_from_env() -> DriveAuthPolicyHandle {
    DriveAuthPolicyHandle::shared_from_env()
}
