use crate::DriveServiceError;
use sdkwork_drive_config::{is_blocked_upload_content_type, UploadContentPolicyMode};
use sdkwork_drive_observability::metrics;

#[derive(Debug, Clone)]
pub struct UploadContentPolicyContext {
    pub tenant_id: String,
    pub upload_item_id: String,
    pub content_type: String,
    pub content_length: i64,
    pub checksum_sha256_hex: String,
}

/// MIME/extension upload policy hook. This is not an antivirus integration.
pub async fn enforce_upload_content_policy(
    context: &UploadContentPolicyContext,
) -> Result<(), DriveServiceError> {
    let mode = UploadContentPolicyMode::from_env();
    if mode == UploadContentPolicyMode::Disabled {
        return Ok(());
    }

    metrics::record_content_scan_pending();
    if !is_blocked_upload_content_type(&context.content_type) {
        return Ok(());
    }

    if mode == UploadContentPolicyMode::Enforce {
        return Err(DriveServiceError::Validation(format!(
            "upload blocked by content policy for content type {}",
            context.content_type
        )));
    }

    tracing::warn!(
        target: "sdkwork.drive",
        event = "drive.upload_content_policy.blocked_type_audit",
        tenant_id = %context.tenant_id,
        upload_item_id = %context.upload_item_id,
        content_type = %context.content_type,
        "upload content type matched blocked MIME policy in audit mode"
    );
    Ok(())
}
