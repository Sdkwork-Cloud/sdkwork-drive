use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteNodePropertyResponse {
    pub deleted: bool,
}
