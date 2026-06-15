#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveQuotaSummary {
    pub tenant_id: String,
    pub total_bytes: i64,
    pub object_count: i64,
}
