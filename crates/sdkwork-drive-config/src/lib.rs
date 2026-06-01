use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveRuntimeConfig {
    pub app_name: String,
}
