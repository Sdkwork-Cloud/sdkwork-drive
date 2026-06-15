use serde::{Deserialize, Serialize};

use crate::models::MaintenanceJob;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MaintenanceJobPage {
    pub items: Vec<MaintenanceJob>,

    pub page: i64,

    #[serde(rename = "pageSize")]
    pub page_size: i64,

    pub total: i64,
}
