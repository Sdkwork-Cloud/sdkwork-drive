use serde::{Deserialize, Serialize};

use crate::models::{DriveComment};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CommentListResponse {
    pub items: Vec<DriveComment>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
