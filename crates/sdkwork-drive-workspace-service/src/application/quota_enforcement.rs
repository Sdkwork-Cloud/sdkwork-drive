use sdkwork_drive_config::TenantQuotaPolicy;

use crate::ports::quota_store::DriveQuotaStore;
use crate::DriveServiceError;

pub async fn ensure_tenant_can_allocate_bytes<S>(
    store: &S,
    tenant_id: &str,
    additional_bytes: i64,
) -> Result<(), DriveServiceError>
where
    S: DriveQuotaStore,
{
    if additional_bytes < 0 {
        return Err(DriveServiceError::Validation(
            "additional_bytes must be greater than or equal to 0".to_string(),
        ));
    }
    let policy = TenantQuotaPolicy::from_env();
    let Some(max_bytes) = policy.max_bytes else {
        return Ok(());
    };
    let summary = store.summarize_tenant_quota(tenant_id).await?;
    let projected = summary.total_bytes.saturating_add(additional_bytes);
    if projected > max_bytes {
        return Err(DriveServiceError::Validation(format!(
            "tenant storage quota exceeded: projected {projected} bytes exceeds limit {max_bytes}"
        )));
    }
    Ok(())
}
