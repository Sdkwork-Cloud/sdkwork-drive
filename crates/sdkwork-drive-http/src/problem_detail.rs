use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// RFC 9457 Problem Details response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProblemDetail {
    /// A URI reference that identifies the problem type.
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub problem_type: Option<String>,

    /// A short, human-readable summary of the problem type.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// The HTTP status code.
    pub status: u16,

    /// A human-readable explanation specific to this occurrence.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    /// A URI reference that identifies the specific occurrence.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,

    /// Additional problem-specific extensions.
    #[serde(flatten)]
    pub extensions: BTreeMap<String, serde_json::Value>,
}

impl ProblemDetail {
    /// Create a new problem detail with the given status code.
    pub fn new(status: StatusCode) -> Self {
        Self {
            problem_type: None,
            title: Some(status.canonical_reason().unwrap_or("Unknown").to_string()),
            status: status.as_u16(),
            detail: None,
            instance: None,
            extensions: BTreeMap::new(),
        }
    }

    /// Set the problem type URI.
    pub fn with_type(mut self, problem_type: impl Into<String>) -> Self {
        self.problem_type = Some(problem_type.into());
        self
    }

    /// Set the title.
    pub fn with_title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// Set the detail message.
    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }

    /// Set the instance URI.
    pub fn with_instance(mut self, instance: impl Into<String>) -> Self {
        self.instance = Some(instance.into());
        self
    }

    /// Add an extension field.
    pub fn with_extension(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.extensions.insert(key.into(), value);
        self
    }

    /// Create a 400 Bad Request problem.
    pub fn bad_request(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST).with_detail(detail)
    }

    /// Create a 401 Unauthorized problem.
    pub fn unauthorized(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED).with_detail(detail)
    }

    /// Create a 403 Forbidden problem.
    pub fn forbidden(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN).with_detail(detail)
    }

    /// Create a 404 Not Found problem.
    pub fn not_found(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND).with_detail(detail)
    }

    /// Create a 409 Conflict problem.
    pub fn conflict(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT).with_detail(detail)
    }

    /// Create a 500 Internal Server Error problem.
    pub fn internal(detail: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR).with_detail(detail)
    }
}

impl IntoResponse for ProblemDetail {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = Json(self).into_response();
        *response.status_mut() = status;
        response
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_problem_detail_creation() {
        let problem = ProblemDetail::bad_request("Invalid input").with_instance("/api/test");

        assert_eq!(problem.status, 400);
        assert_eq!(problem.detail, Some("Invalid input".to_string()));
        assert_eq!(problem.instance, Some("/api/test".to_string()));
    }

    #[test]
    fn test_problem_detail_not_found() {
        let problem = ProblemDetail::not_found("Resource not found");
        assert_eq!(problem.status, 404);
    }
}
