use serde::{Deserialize, Serialize};

use crate::models::Change;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChangeListResponse {
    pub items: Vec<Change>,

    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<i64>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
