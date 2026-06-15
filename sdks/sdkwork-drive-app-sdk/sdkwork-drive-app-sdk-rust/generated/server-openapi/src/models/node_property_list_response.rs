use serde::{Deserialize, Serialize};

use crate::models::DriveNodeProperty;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NodePropertyListResponse {
    pub items: Vec<DriveNodeProperty>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
