use serde::{Deserialize, Serialize};

use crate::models::{DrivePermission};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PermissionListResponse {
    pub items: Vec<DrivePermission>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
