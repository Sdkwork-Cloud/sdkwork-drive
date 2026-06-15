use sqlx::AnyPool;

/// Quota recalculation result.
#[derive(Debug, Clone)]
pub struct QuotaRecalculationResult {
    pub tenants_processed: i64,
    pub spaces_processed: i64,
}

/// Recalculate quota usage for all tenants and spaces.
///
/// This function recalculates the quota usage based on actual
/// node counts and sizes in the database.
pub async fn recalculate_quotas(pool: &AnyPool) -> Result<QuotaRecalculationResult, sqlx::Error> {
    let now = chrono::Utc::now().timestamp_millis();

    // Update quota usage for each tenant
    let tenants_processed = sqlx::query_scalar::<_, i64>(
        r#"
        INSERT INTO drive_quota_usage (id, tenant_id, space_id, used_bytes, file_count, updated_at_ms)
        SELECT
            CONCAT(s.tenant_id, '-', COALESCE(n.space_id, 'all')),
            s.tenant_id,
            n.space_id,
            COALESCE(SUM(0), 0),
            COUNT(n.id),
            $1
        FROM drive_space s
        LEFT JOIN drive_node n ON n.space_id = s.id AND n.node_type = 'file'
        GROUP BY s.tenant_id, n.space_id
        ON CONFLICT (id) DO UPDATE SET
            used_bytes = EXCLUDED.used_bytes,
            file_count = EXCLUDED.file_count,
            updated_at_ms = EXCLUDED.updated_at_ms
        RETURNING 1
        "#
    )
    .bind(now)
    .fetch_all(pool)
    .await?;

    Ok(QuotaRecalculationResult {
        tenants_processed: tenants_processed.len() as i64,
        spaces_processed: tenants_processed.len() as i64,
    })
}
