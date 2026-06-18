use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct QuotaSummary {
    #[serde(rename = "tenantId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<String>,

    #[serde(rename = "usedBytes")]
    pub used_bytes: i64,

    #[serde(rename = "objectCount")]
    pub object_count: i64,
}
