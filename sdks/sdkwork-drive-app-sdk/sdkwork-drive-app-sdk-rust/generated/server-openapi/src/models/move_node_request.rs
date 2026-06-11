use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MoveNodeRequest {
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "targetParentNodeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_parent_node_id: Option<String>,

    #[serde(rename = "operatorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operator_id: Option<String>,
}
