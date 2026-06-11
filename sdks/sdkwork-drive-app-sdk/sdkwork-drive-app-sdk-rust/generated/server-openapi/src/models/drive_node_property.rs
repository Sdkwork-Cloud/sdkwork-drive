use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DriveNodeProperty {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "nodeId")]
    pub node_id: String,

    #[serde(rename = "propertyKey")]
    pub property_key: String,

    #[serde(rename = "propertyValue")]
    pub property_value: String,

    pub visibility: String,

    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    pub version: i64,
}
