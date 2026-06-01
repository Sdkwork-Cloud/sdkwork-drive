use async_trait::async_trait;

use crate::domain::quota::DriveQuotaSummary;
use crate::DriveProductError;

#[async_trait]
pub trait DriveQuotaStore: Send + Sync {
    async fn summarize_tenant_quota(
        &self,
        tenant_id: &str,
    ) -> Result<DriveQuotaSummary, DriveProductError>;
}
