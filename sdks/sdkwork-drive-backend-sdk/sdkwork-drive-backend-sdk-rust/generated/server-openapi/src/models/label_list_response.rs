use serde::{Deserialize, Serialize};

use crate::models::DriveLabel;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LabelListResponse {
    pub items: Vec<DriveLabel>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
