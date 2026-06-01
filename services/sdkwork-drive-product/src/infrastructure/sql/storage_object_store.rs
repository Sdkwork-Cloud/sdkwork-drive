use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

use crate::ports::storage_object_store::{DriveStorageObject, DriveStorageObjectStore};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlStorageObjectStore {
    pool: SqlitePool,
}

impl SqlStorageObjectStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveStorageObjectStore for SqlStorageObjectStore {
    async fn find_latest_active_by_node(
        &self,
        tenant_id: &str,
        node_id: &str,
    ) -> Result<Option<DriveStorageObject>, DriveProductError> {
        let row = sqlx::query(
            "SELECT id, tenant_id, node_id, version_no, bucket, object_key,
                    content_type, content_length, checksum_sha256_hex, lifecycle_status
             FROM drive_storage_object
             WHERE tenant_id=?1
               AND node_id=?2
               AND lifecycle_status='active'
             ORDER BY version_no DESC
             LIMIT 1",
        )
        .bind(tenant_id)
        .bind(node_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("query drive_storage_object failed: {error}"))
        })?;

        let Some(row) = row else {
            return Ok(None);
        };

        Ok(Some(DriveStorageObject {
            id: row.get("id"),
            tenant_id: row.get("tenant_id"),
            node_id: row.get("node_id"),
            version_no: row.get("version_no"),
            bucket: row.get("bucket"),
            object_key: row.get("object_key"),
            content_type: row.get("content_type"),
            content_length: row.get("content_length"),
            checksum_sha256_hex: row.get("checksum_sha256_hex"),
            lifecycle_status: row.get("lifecycle_status"),
        }))
    }
}
