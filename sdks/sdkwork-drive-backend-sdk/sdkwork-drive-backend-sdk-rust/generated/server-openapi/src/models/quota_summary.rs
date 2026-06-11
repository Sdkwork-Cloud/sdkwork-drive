use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct QuotaSummary {
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "totalBytes")]
    pub total_bytes: i64,

    #[serde(rename = "objectCount")]
    pub object_count: i64,
}
