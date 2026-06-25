use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProblemDetail {
    pub r#type: String,

    pub title: String,

    pub status: i64,

    pub detail: String,

    pub code: String,

    #[serde(rename = "traceId")]
    pub trace_id: String,

    #[serde(rename = "requestId")]
    pub request_id: String,
}
