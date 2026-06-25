use sqlx::AnyPool;

/// Cleanup result for expired upload sessions.
#[derive(Debug, Clone)]
pub struct CleanupResult {
    pub expired_sessions: i64,
    pub cleaned_parts: i64,
}

/// Clean up expired upload sessions.
///
/// Marks expired `dr_drive_upload_session` rows and removes associated upload parts.
pub async fn cleanup_expired_sessions(pool: &AnyPool) -> Result<CleanupResult, sqlx::Error> {
    let now = chrono::Utc::now().timestamp_millis();

    let expired_sessions = sqlx::query_scalar::<_, i64>(
        "UPDATE dr_drive_upload_session
         SET state = 'expired',
             updated_by = 'install-worker',
             updated_at = CURRENT_TIMESTAMP
         WHERE state IN ('created', 'uploading', 'completing')
           AND expires_at_epoch_ms < $1
         RETURNING 1",
    )
    .bind(now)
    .fetch_all(pool)
    .await?
    .len() as i64;

    let cleaned_parts = sqlx::query_scalar::<_, i64>(
        "DELETE FROM dr_drive_upload_part
         WHERE upload_session_id IN (
             SELECT id FROM dr_drive_upload_session WHERE state = 'expired'
         )
         RETURNING 1",
    )
    .fetch_all(pool)
    .await?
    .len() as i64;

    Ok(CleanupResult {
        expired_sessions,
        cleaned_parts,
    })
}
