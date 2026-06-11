use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DrivePermission {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "nodeId")]
    pub node_id: String,

    #[serde(rename = "subjectType")]
    pub subject_type: String,

    #[serde(rename = "subjectId")]
    pub subject_id: String,

    pub role: String,

    pub inherited: bool,

    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    pub version: i64,
}
