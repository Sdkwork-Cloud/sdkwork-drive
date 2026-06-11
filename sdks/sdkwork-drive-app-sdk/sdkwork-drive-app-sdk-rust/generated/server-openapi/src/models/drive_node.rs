use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DriveNode {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "spaceId")]
    pub space_id: String,

    #[serde(rename = "parentNodeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_node_id: Option<String>,

    #[serde(rename = "nodeType")]
    pub node_type: String,

    #[serde(rename = "nodeName")]
    pub node_name: String,

    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    pub version: i64,

    /// Target node id when nodeType is shortcut.
    #[serde(rename = "shortcutTargetNodeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut_target_node_id: Option<String>,

    /// Drive uploader usage context identifier. Optional semantic context for idempotency, ownership, and cleanup scoping.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scene: Option<String>,

    /// Drive uploader usage context identifier. Optional semantic context for idempotency, ownership, and cleanup scoping.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}
