use async_trait::async_trait;
use sqlx::any::AnyRow;
use sqlx::AnyPool;
use sqlx::Row;

use crate::domain::space::{DriveSpace, DriveSpaceType};
use crate::ports::space_store::{DriveSpaceStore, NewDriveSpace};
use crate::DriveServiceError;

#[derive(Debug, Clone)]
pub struct SqlSpaceStore {
    pool: AnyPool,
}

impl SqlSpaceStore {
    pub fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveSpaceStore for SqlSpaceStore {
    async fn insert_space(
        &self,
        new_space: &NewDriveSpace,
    ) -> Result<DriveSpace, DriveServiceError> {
        let result = sqlx::query(
            "INSERT INTO dr_drive_space (
                id, tenant_id, owner_subject_type, owner_subject_id,
                space_type, display_name, lifecycle_status,
                version, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9)",
        )
        .bind(&new_space.id)
        .bind(&new_space.tenant_id)
        .bind(&new_space.owner_subject_type)
        .bind(&new_space.owner_subject_id)
        .bind(&new_space.space_type)
        .bind(&new_space.display_name)
        .bind(&new_space.lifecycle_status)
        .bind(&new_space.created_by)
        .bind(&new_space.updated_by)
        .execute(&self.pool)
        .await;

        if let Err(error) = result {
            let message = error.to_string();
            if message.contains("UNIQUE constraint failed") {
                return Err(DriveServiceError::Conflict(
                    "space already exists for tenant/owner/type".to_string(),
                ));
            }
            return Err(DriveServiceError::Internal(format!(
                "insert dr_drive_space failed: {message}"
            )));
        }

        let row = sqlx::query(
            "SELECT id, tenant_id, owner_subject_type, owner_subject_id, display_name, space_type, lifecycle_status, version
            FROM dr_drive_space
            WHERE id=$1",
        )
        .bind(&new_space.id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("read inserted dr_drive_space failed: {error}"))
        })?;

        map_row_to_space(&row)
    }

    async fn list_spaces(
        &self,
        tenant_id: &str,
        owner_subject_type: Option<&str>,
        owner_subject_id: Option<&str>,
    ) -> Result<Vec<DriveSpace>, DriveServiceError> {
        let rows = match (owner_subject_type, owner_subject_id) {
            (Some(owner_type), Some(owner_id)) => {
                sqlx::query(
                    "SELECT id, tenant_id, owner_subject_type, owner_subject_id, display_name, space_type, lifecycle_status, version
                    FROM dr_drive_space
                    WHERE tenant_id=$1
                      AND owner_subject_type=$2
                      AND owner_subject_id=$3
                      AND lifecycle_status='active'
                    ORDER BY id ASC",
                )
                .bind(tenant_id)
                .bind(owner_type)
                .bind(owner_id)
                .fetch_all(&self.pool)
                .await
                .map_err(|error| {
                    DriveServiceError::Internal(format!("list dr_drive_space by owner failed: {error}"))
                })?
            }
            _ => {
                sqlx::query(
                    "SELECT id, tenant_id, owner_subject_type, owner_subject_id, display_name, space_type, lifecycle_status, version
                    FROM dr_drive_space
                    WHERE tenant_id=$1
                      AND lifecycle_status='active'
                    ORDER BY id ASC",
                )
                .bind(tenant_id)
                .fetch_all(&self.pool)
                .await
                .map_err(|error| {
                    DriveServiceError::Internal(format!("list dr_drive_space by tenant failed: {error}"))
                })?
            }
        };

        rows.iter().map(map_row_to_space).collect()
    }

    async fn get_space(
        &self,
        tenant_id: &str,
        space_id: &str,
    ) -> Result<DriveSpace, DriveServiceError> {
        let row = sqlx::query(
            "SELECT id, tenant_id, owner_subject_type, owner_subject_id, display_name, space_type, lifecycle_status, version
             FROM dr_drive_space
             WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
        )
        .bind(tenant_id)
        .bind(space_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("get dr_drive_space failed: {error}"))
        })?;
        let Some(row) = row else {
            return Err(DriveServiceError::NotFound("space not found".to_string()));
        };
        map_row_to_space(&row)
    }

    async fn update_space(
        &self,
        tenant_id: &str,
        space_id: &str,
        display_name: &str,
        operator_id: &str,
    ) -> Result<DriveSpace, DriveServiceError> {
        let affected = sqlx::query(
            "UPDATE dr_drive_space
             SET display_name=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$3 AND id=$4 AND lifecycle_status='active'",
        )
        .bind(display_name)
        .bind(operator_id)
        .bind(tenant_id)
        .bind(space_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("update dr_drive_space failed: {error}"))
        })?
        .rows_affected();
        if affected == 0 {
            return Err(DriveServiceError::NotFound("space not found".to_string()));
        }
        self.get_space(tenant_id, space_id).await
    }

    async fn delete_space(
        &self,
        tenant_id: &str,
        space_id: &str,
        operator_id: &str,
    ) -> Result<DriveSpace, DriveServiceError> {
        let affected = sqlx::query(
            "UPDATE dr_drive_space
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$2 AND id=$3 AND lifecycle_status='active'",
        )
        .bind(operator_id)
        .bind(tenant_id)
        .bind(space_id)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("delete dr_drive_space failed: {error}"))
        })?
        .rows_affected();
        if affected == 0 {
            return Err(DriveServiceError::NotFound("space not found".to_string()));
        }

        let row = sqlx::query(
            "SELECT id, tenant_id, owner_subject_type, owner_subject_id, display_name, space_type, lifecycle_status, version
             FROM dr_drive_space
             WHERE tenant_id=$1 AND id=$2",
        )
        .bind(tenant_id)
        .bind(space_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("read deleted dr_drive_space failed: {error}"))
        })?;
        map_row_to_space(&row)
    }
}

fn map_row_to_space(row: &AnyRow) -> Result<DriveSpace, DriveServiceError> {
    let space_type_raw: String = row.get("space_type");
    let space_type = DriveSpaceType::try_from_str(&space_type_raw).ok_or_else(|| {
        DriveServiceError::Internal(format!("unknown space_type in database: {space_type_raw}"))
    })?;

    Ok(DriveSpace {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        owner_subject_type: row.get("owner_subject_type"),
        owner_subject_id: row.get("owner_subject_id"),
        display_name: row.get("display_name"),
        space_type,
        lifecycle_status: row.get("lifecycle_status"),
        version: row.get("version"),
    })
}
