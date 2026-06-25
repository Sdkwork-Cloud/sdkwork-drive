use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct EmptyTrashResponse {
    #[serde(rename = "deletedCount")]
    pub deleted_count: i64,
}
