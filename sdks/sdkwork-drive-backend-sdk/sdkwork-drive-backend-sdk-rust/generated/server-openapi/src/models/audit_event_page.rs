use serde::{Deserialize, Serialize};

use crate::models::{AuditEvent};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuditEventPage {
    pub items: Vec<AuditEvent>,

    pub page: i64,

    #[serde(rename = "pageSize")]
    pub page_size: i64,

    pub total: i64,
}
