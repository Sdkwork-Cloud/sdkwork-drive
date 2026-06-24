use serde::{Deserialize, Serialize};

use crate::models::{ProviderBucketListItem};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderBucketList {
    #[serde(rename = "providerId")]
    pub provider_id: String,

    #[serde(rename = "configuredBucket")]
    pub configured_bucket: String,

    pub items: Vec<ProviderBucketListItem>,
}
