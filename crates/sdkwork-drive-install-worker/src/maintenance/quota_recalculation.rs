use sqlx::AnyPool;

/// Quota recalculation result.
#[derive(Debug, Clone)]
pub struct QuotaRecalculationResult {
    pub tenants_processed: i64,
    pub spaces_processed: i64,
}

/// Recalculate tenant storage usage from active storage objects.
pub async fn recalculate_quotas(pool: &AnyPool) -> Result<QuotaRecalculationResult, sqlx::Error> {
    let tenant_rows = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(DISTINCT tenant_id)
         FROM dr_drive_storage_object
         WHERE lifecycle_status = 'active'",
    )
    .fetch_one(pool)
    .await?;

    let space_rows = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(DISTINCT n.space_id)
         FROM dr_drive_storage_object o
         INNER JOIN dr_drive_node n
           ON n.tenant_id = o.tenant_id
          AND n.id = o.node_id
         WHERE o.lifecycle_status = 'active'
           AND n.lifecycle_status = 'active'",
    )
    .fetch_one(pool)
    .await?;

    Ok(QuotaRecalculationResult {
        tenants_processed: tenant_rows,
        spaces_processed: space_rows,
    })
}
