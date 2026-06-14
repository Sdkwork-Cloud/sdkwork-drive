use sqlx::AnyPool;

/// Cleanup result for expired upload sessions.
#[derive(Debug, Clone)]
pub struct CleanupResult {
    pub expired_sessions: i64,
    pub cleaned_parts: i64,
}

/// Clean up expired upload sessions.
///
/// This function marks expired upload sessions as 'expired'
/// and removes their associated parts.
pub async fn cleanup_expired_sessions(
    pool: &AnyPool,
) -> Result<CleanupResult, sqlx::Error> {
    let now = chrono::Utc::now().timestamp_millis();

    // Find expired sessions
    let expired_count = sqlx::query_scalar::<_, i64>(
        "UPDATE drive_upload_session SET state = 'expired', updated_at_ms = $1 WHERE state IN ('created', 'uploading') AND expires_at_ms < $1 RETURNING COUNT(*)"
    )
    .bind(now)
    .fetch_one(pool)
    .await?;

    // Clean up parts for expired sessions
    let parts_count = sqlx::query_scalar::<_, i64>(
        "DELETE FROM drive_upload_part WHERE session_id IN (SELECT id FROM drive_upload_session WHERE state = 'expired') RETURNING COUNT(*)"
    )
    .fetch_one(pool)
    .await?;

    Ok(CleanupResult {
        expired_sessions: expired_count,
        cleaned_parts: parts_count,
    })
}
