use sdkwork_drive_contract::drive::events::{
    derive_webhook_signing_key, WEBHOOK_SIGNING_TOKEN_MAX_LENGTH, WEBHOOK_SIGNING_TOKEN_MIN_LENGTH,
};

use crate::domain::root_scope_event_delivery::DriveRootScopeEventDelivery;
use crate::ports::root_scope_event_delivery_store::{
    DriveRootScopeEventDeliveryStore, EnsureDriveRootScopeEventDelivery,
};
use crate::DriveServiceError;

use super::root_scope_subscription_service::require_text;

const KNOWLEDGEBASE_CHANNEL_PREFIX: &str = "kbraw:";

#[derive(Debug, Clone)]
pub struct EnsureRootScopeEventDeliveryCommand {
    pub tenant_id: String,
    pub subscription_uuid: String,
    pub address: String,
    pub verification_token: String,
    pub expiration_epoch_ms: i64,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct EnsureRootScopeEventDeliveryResult {
    pub delivery: DriveRootScopeEventDelivery,
    pub created: bool,
}

#[derive(Debug, Clone)]
pub struct DriveRootScopeEventDeliveryService<S>
where
    S: DriveRootScopeEventDeliveryStore,
{
    store: S,
}

impl<S> DriveRootScopeEventDeliveryService<S>
where
    S: DriveRootScopeEventDeliveryStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn ensure_delivery(
        &self,
        command: EnsureRootScopeEventDeliveryCommand,
    ) -> Result<EnsureRootScopeEventDeliveryResult, DriveServiceError> {
        let tenant_id = require_text(command.tenant_id, "tenant_id", 64)?;
        let subscription_uuid = require_text(command.subscription_uuid, "subscription_uuid", 64)?;
        uuid::Uuid::parse_str(&subscription_uuid).map_err(|_| {
            DriveServiceError::Validation("subscription_uuid must be a UUID".to_string())
        })?;
        let address = sdkwork_drive_security::validate_webhook_https_url(&command.address)
            .map_err(|detail| DriveServiceError::Validation(detail.to_string()))?
            .to_string();
        validate_verification_token(&command.verification_token)?;
        if command.expiration_epoch_ms <= chrono::Utc::now().timestamp_millis() {
            return Err(DriveServiceError::Validation(
                "expiration_epoch_ms must be in the future".to_string(),
            ));
        }
        let operator_id = require_text(command.operator_id, "operator_id", 128)?;
        let channel_id = format!("{KNOWLEDGEBASE_CHANNEL_PREFIX}{subscription_uuid}");
        let result = self
            .store
            .ensure_delivery(&EnsureDriveRootScopeEventDelivery {
                tenant_id,
                subscription_uuid,
                channel_id,
                address,
                signing_key_sha256: derive_webhook_signing_key(&command.verification_token),
                expiration_epoch_ms: command.expiration_epoch_ms,
                operator_id,
            })
            .await?;
        Ok(EnsureRootScopeEventDeliveryResult {
            delivery: result.delivery,
            created: result.created,
        })
    }
}

fn validate_verification_token(token: &str) -> Result<(), DriveServiceError> {
    if token.len() < WEBHOOK_SIGNING_TOKEN_MIN_LENGTH
        || token.len() > WEBHOOK_SIGNING_TOKEN_MAX_LENGTH
        || token.chars().any(char::is_whitespace)
        || !token
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(DriveServiceError::Validation(format!(
            "verification_token must contain {WEBHOOK_SIGNING_TOKEN_MIN_LENGTH} to {WEBHOOK_SIGNING_TOKEN_MAX_LENGTH} base64url characters"
        )));
    }
    Ok(())
}
