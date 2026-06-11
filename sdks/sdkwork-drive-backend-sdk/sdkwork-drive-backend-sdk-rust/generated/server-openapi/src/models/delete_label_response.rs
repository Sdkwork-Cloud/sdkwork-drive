use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteLabelResponse {
    pub deleted: bool,
}
