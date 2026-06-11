use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TestStorageProviderRequest {
    #[serde(rename = "operatorId")]
    pub operator_id: String,
}
