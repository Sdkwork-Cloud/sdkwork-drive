use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteVersionResponse {
    pub deleted: bool,
}
