use serde::{Deserialize, Serialize};

use crate::models::{DriveLabelSummary};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NodeLabel {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "nodeId")]
    pub node_id: String,

    #[serde(rename = "labelId")]
    pub label_id: String,

    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    pub version: i64,

    pub label: DriveLabelSummary,
}
