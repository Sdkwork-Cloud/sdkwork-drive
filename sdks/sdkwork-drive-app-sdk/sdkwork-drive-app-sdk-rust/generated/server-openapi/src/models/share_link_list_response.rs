use serde::{Deserialize, Serialize};

use crate::models::DriveShareLink;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ShareLinkListResponse {
    pub items: Vec<DriveShareLink>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
