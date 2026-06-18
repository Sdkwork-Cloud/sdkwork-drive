use crate::error::{problem, ProblemDetail};
use crate::validators::{normalize_optional_text, require_query_value, validate_subject_type};
use axum::body::Body;
use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use axum::Json;
use sdkwork_drive_security::DriveAppContext;
use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub(crate) struct DriveRequestContext {
    pub(crate) tenant_id: String,
    pub(crate) user_id: String,
    pub(crate) app_id: Option<String>,
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
            None => require_query_value(None, "tenantId"),
        }
    }

    pub(crate) fn resolve_operator_id(
        &self,
        requested: Option<String>,
    ) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
        match normalize_optional_text(requested) {
            Some(value) => self.ensure_actor_match(&value).map(|_| value),
            None if self.from_token => Ok(self.actor_id.clone()),
            None => Ok("operator-unset".to_string()),
        }
    }

    pub(crate) fn resolve_app_id(
        &self,
        requested: Option<String>,
    ) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
        match normalize_optional_text(requested) {
            Some(value) => self.ensure_app_match(&value).map(|_| value),
            None if self.from_token => match self.app_id.clone() {
                Some(app_id) => Ok(app_id),
                None => require_query_value(None, "appId"),
            },
            None => require_query_value(None, "appId"),
        }
    }

    pub(crate) fn resolve_uploader_user_id(
        &self,
        requested: Option<String>,
    ) -> Result<Option<String>, (StatusCode, Json<ProblemDetail>)> {
        match normalize_optional_text(requested) {
            Some(value) => {
                self.ensure_user_match(&value)?;
                Ok(Some(value))
            }
            None if self.from_token && self.subject_type == "user" => {
                Ok(Some(self.user_id.clone()))
            }
            None => Ok(None),
        }
    }

    pub(crate) fn resolve_subject(
        &self,
        requested_type: Option<String>,
        requested_id: Option<String>,
    ) -> Result<(String, String), (StatusCode, Json<ProblemDetail>)> {
        let subject_type = match normalize_optional_text(requested_type) {
            Some(value) => {
                validate_subject_type(&value)?;
                self.ensure_subject_type_match(&value)?;
                value
            }
            None if self.from_token => self.subject_type.clone(),
            None => require_query_value(None, "subjectType")?,
        };
        let subject_id = match normalize_optional_text(requested_id) {
            Some(value) => {
                self.ensure_subject_id_match(&value)?;
                value
            }
            None if self.from_token => self.subject_id.clone(),
            None => require_query_value(None, "subjectId")?,
        };
        Ok((subject_type, subject_id))
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

    fn ensure_subject_type_match(
        &self,
        value: &str,
    ) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.subject_type {
            return Ok(());
        }
        Err(context_conflict(
            "request subjectType does not match verified SDKWork AppContext subject type",
        ))
    }

    fn ensure_subject_id_match(
        &self,
        value: &str,
    ) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.subject_id {
            return Ok(());
        }
        Err(context_conflict(
            "request subjectId does not match verified SDKWork AppContext subject",
        ))
    }

    fn ensure_user_match(&self, value: &str) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.user_id {
            return Ok(());
        }
        Err(context_conflict(
            "request userId does not match verified SDKWork AppContext user",
        ))
    }

    fn ensure_app_match(&self, value: &str) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token {
            return Ok(());
        }
        let Some(token_app_id) = self.app_id.as_deref() else {
            return Ok(());
        };
        if value == token_app_id {
            return Ok(());
        }
        Err(context_conflict(
            "request appId does not match verified SDKWork AppContext app",
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
            user_id: app_context.user_id.clone(),
            app_id: app_context.app_id.clone(),
            actor_id: app_context.actor_id,
            subject_type: app_context.actor_kind,
            subject_id: app_context.user_id,
            from_token: true,
        })
        .unwrap_or_else(|| DriveRequestContext {
            tenant_id: normalize_optional_text(query.get("tenantId").cloned()).unwrap_or_default(),
            user_id: normalize_optional_text(query.get("userId").cloned()).unwrap_or_default(),
            app_id: normalize_optional_text(query.get("appId").cloned()),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_tenant_id_from_token_when_query_is_omitted() {
        let ctx = DriveRequestContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            app_id: Some("appbase".to_string()),
            actor_id: "user-001".to_string(),
            subject_type: "user".to_string(),
            subject_id: "user-001".to_string(),
            from_token: true,
        };

        assert_eq!(ctx.resolve_tenant_id(None).expect("tenant"), "tenant-001");
    }

    #[test]
    fn reject_conflicting_tenant_id_from_token_context() {
        let ctx = DriveRequestContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            app_id: Some("appbase".to_string()),
            actor_id: "user-001".to_string(),
            subject_type: "user".to_string(),
            subject_id: "user-001".to_string(),
            from_token: true,
        };

        let error = ctx
            .resolve_tenant_id(Some("tenant-002".to_string()))
            .expect_err("conflict");
        assert_eq!(error.0, StatusCode::FORBIDDEN);
    }

    #[test]
    fn resolve_subject_from_token_when_query_is_omitted() {
        let ctx = DriveRequestContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            app_id: Some("appbase".to_string()),
            actor_id: "user-001".to_string(),
            subject_type: "user".to_string(),
            subject_id: "user-001".to_string(),
            from_token: true,
        };

        let (subject_type, subject_id) = ctx.resolve_subject(None, None).expect("subject");
        assert_eq!(subject_type, "user");
        assert_eq!(subject_id, "user-001");
    }

    #[test]
    fn resolve_app_id_and_user_id_from_token_when_body_omits_them() {
        let ctx = DriveRequestContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            app_id: Some("appbase".to_string()),
            actor_id: "user-001".to_string(),
            subject_type: "user".to_string(),
            subject_id: "user-001".to_string(),
            from_token: true,
        };

        assert_eq!(ctx.resolve_app_id(None).expect("app"), "appbase");
        assert_eq!(
            ctx.resolve_uploader_user_id(None).expect("user"),
            Some("user-001".to_string())
        );
    }
}
