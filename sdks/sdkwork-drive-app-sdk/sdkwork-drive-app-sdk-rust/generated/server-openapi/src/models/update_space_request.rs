use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateSpaceRequest {
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    #[serde(rename = "operatorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operator_id: Option<String>,
}
