use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteStorageProviderResponse {
    pub deleted: bool,
}
