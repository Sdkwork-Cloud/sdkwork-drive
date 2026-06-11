use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FavoriteNodeRequest {
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "subjectType")]
    pub subject_type: String,

    #[serde(rename = "subjectId")]
    pub subject_id: String,

    #[serde(rename = "operatorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operator_id: Option<String>,
}
