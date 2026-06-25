use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreatePermissionRequest {
    pub id: String,

    pub role: String,
}
