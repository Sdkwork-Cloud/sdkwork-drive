use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateCommentReplyRequest {
    pub id: String,

    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    pub content: String,

    #[serde(rename = "operatorId")]
    pub operator_id: String,
}
