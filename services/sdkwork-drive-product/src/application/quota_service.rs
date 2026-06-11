use crate::domain::quota::DriveQuotaSummary;
use crate::ports::quota_store::DriveQuotaStore;
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct GetTenantQuotaSummaryCommand {
    pub tenant_id: String,
}

#[derive(Debug, Clone)]
pub struct DriveQuotaService<S>
where
    S: DriveQuotaStore,
{
    store: S,
}

impl<S> DriveQuotaService<S>
where
    S: DriveQuotaStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn get_tenant_quota_summary(
        &self,
        command: GetTenantQuotaSummaryCommand,
    ) -> Result<DriveQuotaSummary, DriveProductError> {
        if command.tenant_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "tenant_id is required".to_string(),
            ));
        }
        self.store
            .summarize_tenant_quota(command.tenant_id.trim())
            .await
    }
}
