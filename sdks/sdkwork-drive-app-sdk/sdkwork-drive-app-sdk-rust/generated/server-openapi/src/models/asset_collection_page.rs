use serde::{Deserialize, Serialize};

use crate::models::{AssetCollection};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AssetCollectionPage {
    pub items: Vec<AssetCollection>,

    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}
