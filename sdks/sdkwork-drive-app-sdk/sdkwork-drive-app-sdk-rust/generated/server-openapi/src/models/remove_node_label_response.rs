use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RemoveNodeLabelResponse {
    pub removed: bool,
}
