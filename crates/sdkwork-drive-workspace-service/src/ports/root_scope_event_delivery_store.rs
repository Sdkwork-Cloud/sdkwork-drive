use async_trait::async_trait;

use crate::domain::root_scope_event_delivery::DriveRootScopeEventDelivery;
use crate::DriveServiceError;

#[derive(Debug, Clone)]
pub struct EnsureDriveRootScopeEventDelivery {
    pub tenant_id: String,
    pub subscription_uuid: String,
    pub channel_id: String,
    pub address: String,
    pub signing_key_sha256: String,
    pub expiration_epoch_ms: i64,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct EnsureDriveRootScopeEventDeliveryResult {
    pub delivery: DriveRootScopeEventDelivery,
    pub created: bool,
}

#[async_trait]
pub trait DriveRootScopeEventDeliveryStore: Send + Sync {
    async fn ensure_delivery(
        &self,
        command: &EnsureDriveRootScopeEventDelivery,
    ) -> Result<EnsureDriveRootScopeEventDeliveryResult, DriveServiceError>;
}
