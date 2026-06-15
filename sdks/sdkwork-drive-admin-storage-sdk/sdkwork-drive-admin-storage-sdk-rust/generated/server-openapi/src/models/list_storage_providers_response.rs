use serde::{Deserialize, Serialize};

use crate::models::StorageProvider;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListStorageProvidersResponse {
    pub items: Vec<StorageProvider>,
}
