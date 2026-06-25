use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FavoriteNodeRequest {
    #[serde(rename = "subjectType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject_type: Option<String>,

    #[serde(rename = "subjectId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject_id: Option<String>,

    #[serde(rename = "operatorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operator_id: Option<String>,
}
