use serde::{Deserialize, Serialize};

use crate::models::{ProviderObject};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderObjectList {
    #[serde(rename = "providerId")]
    pub provider_id: String,

    pub bucket: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prefix: Option<String>,

    pub items: Vec<ProviderObject>,

    #[serde(rename = "nextPageToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_page_token: Option<String>,
}
