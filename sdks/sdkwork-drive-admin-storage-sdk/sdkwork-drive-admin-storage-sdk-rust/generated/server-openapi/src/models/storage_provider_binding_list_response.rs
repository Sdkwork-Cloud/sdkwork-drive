use serde::{Deserialize, Serialize};

use crate::models::StorageProviderBinding;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageProviderBindingListResponse {
    pub items: Vec<StorageProviderBinding>,
}
