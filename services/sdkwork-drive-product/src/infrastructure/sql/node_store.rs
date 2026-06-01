use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::Row;

use crate::domain::node::{DriveNode, DriveNodeType};
use crate::ports::node_store::{DriveNodeStore, NewDriveNode};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlNodeStore {
    pool: SqlitePool,
}

impl SqlNodeStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveNodeStore for SqlNodeStore {
    async fn exists_live_name_in_parent(
        &self,
        tenant_id: &str,
        space_id: &str,
        parent_node_id: Option<&str>,
        node_name: &str,
    ) -> Result<bool, DriveProductError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM drive_node
             WHERE tenant_id=?1
               AND space_id=?2
               AND node_name=?3
               AND lifecycle_status='active'
               AND (
                   (parent_node_id IS NULL AND ?4 IS NULL)
                   OR parent_node_id = ?4
               )",
        )
        .bind(tenant_id)
        .bind(space_id)
        .bind(node_name)
        .bind(parent_node_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("check drive_node duplicate failed: {error}"))
        })?;

        Ok(count > 0)
    }

    async fn insert_node(&self, new_node: &NewDriveNode) -> Result<DriveNode, DriveProductError> {
        sqlx::query(
            "INSERT INTO drive_node (
                id, tenant_id, space_id, parent_node_id,
                node_type, node_name, content_state, lifecycle_status,
                version, created_by, updated_by
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'empty', ?7, 1, ?8, ?9)",
        )
        .bind(&new_node.id)
        .bind(&new_node.tenant_id)
        .bind(&new_node.space_id)
        .bind(&new_node.parent_node_id)
        .bind(&new_node.node_type)
        .bind(&new_node.node_name)
        .bind(&new_node.lifecycle_status)
        .bind(&new_node.created_by)
        .bind(&new_node.updated_by)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            let message = error.to_string();
            if message.contains("UNIQUE constraint failed") {
                return DriveProductError::Conflict(
                    "node name already exists in parent".to_string(),
                );
            }
            DriveProductError::Internal(format!("insert drive_node failed: {message}"))
        })?;

        let row = sqlx::query(
            "SELECT id, tenant_id, space_id, parent_node_id, node_type, node_name, lifecycle_status, version
             FROM drive_node
             WHERE id=?1",
        )
        .bind(&new_node.id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("read inserted drive_node failed: {error}"))
        })?;

        let node_type_raw: String = row.get("node_type");
        let node_type = DriveNodeType::try_from_str(&node_type_raw).ok_or_else(|| {
            DriveProductError::Internal(format!("unknown node_type in database: {node_type_raw}"))
        })?;

        Ok(DriveNode {
            id: row.get("id"),
            tenant_id: row.get("tenant_id"),
            space_id: row.get("space_id"),
            parent_node_id: row.get("parent_node_id"),
            node_type,
            node_name: row.get("node_name"),
            lifecycle_status: row.get("lifecycle_status"),
            version: row.get("version"),
        })
    }
}
