use serde::{Deserialize, Serialize};

use crate::models::{DriveSpace};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteSpaceResponse {
    pub deleted: bool,

    pub space: DriveSpace,

    #[serde(rename = "deletedNodeCount")]
    pub deleted_node_count: i64,
}
