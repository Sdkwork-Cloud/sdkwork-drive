use serde::{Deserialize, Serialize};

use crate::models::{AssetItem};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AssetPage {
    pub items: Vec<AssetItem>,

    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}
