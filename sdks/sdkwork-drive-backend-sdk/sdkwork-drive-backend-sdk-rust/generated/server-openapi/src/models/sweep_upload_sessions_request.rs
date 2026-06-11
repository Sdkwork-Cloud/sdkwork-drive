use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SweepUploadSessionsRequest {
    #[serde(rename = "nowEpochMs")]
    pub now_epoch_ms: i64,

    #[serde(rename = "dryRun")]
    pub dry_run: bool,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,

    #[serde(rename = "operatorId")]
    pub operator_id: String,

    #[serde(rename = "requestId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    #[serde(rename = "traceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}
