use serde::{Deserialize, Serialize};

use crate::models::{DriveWatchChannel};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DriveWatchChannelListResponse {
    pub items: Vec<DriveWatchChannel>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
