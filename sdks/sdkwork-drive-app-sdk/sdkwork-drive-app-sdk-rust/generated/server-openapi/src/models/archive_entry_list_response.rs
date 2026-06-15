use serde::{Deserialize, Serialize};

use crate::models::ArchiveEntry;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArchiveEntryListResponse {
    pub items: Vec<ArchiveEntry>,
}
