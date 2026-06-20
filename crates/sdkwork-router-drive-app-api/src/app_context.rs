use crate::error::{problem, ProblemDetail};
use crate::validators::{normalize_optional_text, require_query_value, validate_subject_type};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_security::DriveAppContext;

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
    pub(crate) fn from_app_context(app_context: &DriveAppContext) -> Self {
        Self {
            tenant_id: app_context.tenant_id.clone(),
            user_id: app_context.user_id.clone(),
            app_id: app_context.app_id.clone(),
            actor_id: app_context.actor_id.clone(),
            subject_type: app_context.actor_kind.clone(),
            subject_id: app_context.user_id.clone(),
            from_token: true,
        }
    }

    pub(crate) fn resolve_tenant_id(&self) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
        if self.from_token {
            Ok(self.tenant_id.clone())
        } else {
            Err(problem(
                StatusCode::UNAUTHORIZED,
                "unauthorized",
                "verified WebRequestContext is required",
                "sdkwork.auth.missing_request_context",
            ))
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

fn context_conflict(detail: &str) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::FORBIDDEN,
        "forbidden",
        detail,
        "sdkwork.auth.context_conflict",
    )
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

        assert_eq!(ctx.resolve_tenant_id().expect("tenant"), "tenant-001");
    }

    #[test]
    fn reject_tenant_resolution_without_token_context() {
        let ctx = DriveRequestContext {
            tenant_id: "tenant-001".to_string(),
            user_id: "user-001".to_string(),
            app_id: Some("appbase".to_string()),
            actor_id: "user-001".to_string(),
            subject_type: "user".to_string(),
            subject_id: "user-001".to_string(),
            from_token: false,
        };

        let error = ctx.resolve_tenant_id().expect_err("missing token context");
        assert_eq!(error.0, StatusCode::UNAUTHORIZED);
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
