use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateSpaceRequest {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    #[serde(rename = "ownerSubjectType")]
    pub owner_subject_type: String,

    #[serde(rename = "ownerSubjectId")]
    pub owner_subject_id: String,

    #[serde(rename = "displayName")]
    pub display_name: String,

    #[serde(rename = "spaceType")]
    pub space_type: String,

    #[serde(rename = "operatorId")]
    pub operator_id: String,
}
