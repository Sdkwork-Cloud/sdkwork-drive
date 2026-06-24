use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StopWatchChannelRequest {
    #[serde(rename = "operatorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operator_id: Option<String>,
}
