use serde::{Deserialize, Serialize};

use crate::models::FieldError;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProblemDetail {
    pub r#type: String,

    pub title: String,

    pub status: i64,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    #[serde(rename = "traceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,

    /// Server-owned request correlation id.
    #[serde(rename = "requestId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<FieldError>>,
}
