use crate::error::{map_service_error, problem, ProblemDetail};
use crate::validators::normalize_optional_text;
use axum::body::Body;
use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use sdkwork_drive_security::DriveAppContext;
use sdkwork_drive_workspace_service::DriveServiceError;
use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub(crate) struct DriveRequestContext {
    pub(crate) tenant_id: String,
    pub(crate) actor_id: String,
    pub(crate) subject_type: String,
    pub(crate) subject_id: String,
    from_token: bool,
}

impl DriveRequestContext {
    pub(crate) fn resolve_tenant_id(
        &self,
        requested: Option<String>,
    ) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
        match normalize_optional_text(requested) {
            Some(value) => self.ensure_tenant_match(&value).map(|_| value),
            None if self.from_token => Ok(self.tenant_id.clone()),
            None => Err(map_service_error(DriveServiceError::Validation(
                "tenantId is required".to_string(),
            ))),
        }
    }

    pub(crate) fn resolve_operator_id(
        &self,
        requested: Option<String>,
    ) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
        match normalize_optional_text(requested) {
            Some(value) => self.ensure_actor_match(&value).map(|_| value),
            None if self.from_token => Ok(self.actor_id.clone()),
            None => Err(map_service_error(DriveServiceError::Validation(
                "operatorId is required".to_string(),
            ))),
        }
    }

    fn ensure_tenant_match(&self, value: &str) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.tenant_id {
            return Ok(());
        }
        Err(context_conflict(
            "request tenant does not match verified SDKWork AppContext tenant",
        ))
    }

    fn ensure_actor_match(&self, value: &str) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.actor_id {
            return Ok(());
        }
        Err(context_conflict(
            "request operator does not match verified SDKWork AppContext actor",
        ))
    }
}

pub(crate) async fn inject_drive_request_context(
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<ProblemDetail>)> {
    let query = parse_uri_query(request.uri().query());
    let context = request
        .extensions()
        .get::<DriveAppContext>()
        .cloned()
        .map(|app_context| DriveRequestContext {
            tenant_id: app_context.tenant_id,
            actor_id: app_context.actor_id,
            subject_type: app_context.actor_kind,
            subject_id: app_context.user_id,
            from_token: true,
        })
        .unwrap_or_else(|| DriveRequestContext {
            tenant_id: normalize_optional_text(query.get("tenantId").cloned()).unwrap_or_default(),
            actor_id: normalize_optional_text(query.get("operatorId").cloned())
                .unwrap_or_else(|| "operator-unset".to_string()),
            subject_type: normalize_optional_text(query.get("subjectType").cloned())
                .unwrap_or_else(|| "user".to_string()),
            subject_id: normalize_optional_text(query.get("subjectId").cloned())
                .unwrap_or_default(),
            from_token: false,
        });

    request.extensions_mut().insert(context);
    Ok(next.run(request).await)
}

fn context_conflict(detail: &str) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::FORBIDDEN,
        "forbidden",
        detail,
        "sdkwork.auth.context_conflict",
    )
}

fn parse_uri_query(query: Option<&str>) -> BTreeMap<String, String> {
    let mut values = BTreeMap::new();
    let Some(query) = query else {
        return values;
    };
    for pair in query.split('&') {
        if pair.is_empty() {
            continue;
        }
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        values.insert(percent_decode(key), percent_decode(value));
    }
    values
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let (Some(high), Some(low)) =
                    (hex_value(bytes[index + 1]), hex_value(bytes[index + 2]))
                {
                    decoded.push((high << 4) | low);
                    index += 3;
                } else {
                    decoded.push(bytes[index]);
                    index += 1;
                }
            }
            current => {
                decoded.push(current);
                index += 1;
            }
        }
    }
    String::from_utf8_lossy(&decoded).to_string()
}

fn hex_value(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}
