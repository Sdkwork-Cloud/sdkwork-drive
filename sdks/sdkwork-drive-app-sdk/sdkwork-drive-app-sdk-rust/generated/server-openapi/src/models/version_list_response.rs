use serde::{Deserialize, Serialize};

use crate::models::{FileVersion};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VersionListResponse {
    pub items: Vec<FileVersion>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
