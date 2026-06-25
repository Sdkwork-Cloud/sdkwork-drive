use serde::{Deserialize, Serialize};

use crate::models::{DownloadPackage};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DownloadPackagePage {
    pub items: Vec<DownloadPackage>,

    pub page: i64,

    #[serde(rename = "pageSize")]
    pub page_size: i64,

    pub total: i64,
}
