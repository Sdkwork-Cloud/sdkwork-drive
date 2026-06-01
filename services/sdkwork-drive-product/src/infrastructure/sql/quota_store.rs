use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

use crate::domain::quota::DriveQuotaSummary;
use crate::ports::quota_store::DriveQuotaStore;
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlQuotaStore {
    pool: SqlitePool,
}

impl SqlQuotaStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveQuotaStore for SqlQuotaStore {
    async fn summarize_tenant_quota(
        &self,
        tenant_id: &str,
    ) -> Result<DriveQuotaSummary, DriveProductError> {
        let row = sqlx::query(
            "SELECT
                COALESCE(SUM(content_length), 0) AS total_bytes,
                COUNT(1) AS object_count
             FROM drive_storage_object
             WHERE tenant_id=?1
               AND lifecycle_status='active'",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "summarize drive_storage_object quota failed: {error}"
            ))
        })?;

        Ok(DriveQuotaSummary {
            tenant_id: tenant_id.to_string(),
            total_bytes: row.get("total_bytes"),
            object_count: row.get("object_count"),
        })
    }
}
