use serde::{Deserialize, Serialize};

use crate::models::{EffectivePermission};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct EffectivePermissionListResponse {
    pub items: Vec<EffectivePermission>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
