use crate::error::{map_service_error, problem, ProblemDetail};
use crate::validators::normalize_optional_text;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_security::DriveAppContext;
use sdkwork_drive_workspace_service::DriveServiceError;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub(crate) struct DriveRequestContext {
    pub(crate) tenant_id: String,
    pub(crate) actor_id: String,
    pub(crate) subject_type: String,
    pub(crate) subject_id: String,
    from_token: bool,
}

impl DriveRequestContext {
    pub(crate) fn from_app_context(app_context: &DriveAppContext) -> Self {
        Self {
            tenant_id: app_context.tenant_id.clone(),
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
            Err(map_service_error(DriveServiceError::Validation(
                "verified WebRequestContext is required".to_string(),
            )))
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

    fn ensure_actor_match(&self, value: &str) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
        if !self.from_token || value == self.actor_id {
            return Ok(());
        }
        Err(context_conflict(
            "request operator does not match verified SDKWork AppContext actor",
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
