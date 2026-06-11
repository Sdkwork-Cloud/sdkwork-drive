use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteStorageProviderBindingResponse {
    pub deleted: bool,
}
