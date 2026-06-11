use serde::{Deserialize, Serialize};

use crate::models::{DriveNode};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NodeListResponse {
    pub items: Vec<DriveNode>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
