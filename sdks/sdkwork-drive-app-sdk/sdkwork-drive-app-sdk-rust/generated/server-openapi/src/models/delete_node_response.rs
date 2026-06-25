use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteNodeResponse {
    pub deleted: bool,
}
