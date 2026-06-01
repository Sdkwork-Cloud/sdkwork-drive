use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::domain::storage_provider::{DriveStorageProvider, DriveStorageProviderKind};
use crate::ports::storage_provider_store::{
    DriveStorageProviderStore, NewDriveStorageProvider, UpdateDriveStorageProvider,
};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlStorageProviderStore {
    pool: SqlitePool,
}

impl SqlStorageProviderStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveStorageProviderStore for SqlStorageProviderStore {
    async fn insert_storage_provider(
        &self,
        new_provider: &NewDriveStorageProvider,
    ) -> Result<DriveStorageProvider, DriveProductError> {
        let result = sqlx::query(
            "INSERT INTO drive_storage_provider (
                id, provider_kind, name, endpoint_url, region, bucket, path_style,
                credential_ref, server_side_encryption_mode, default_storage_class,
                status, version, created_by, updated_by
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12, ?13)",
        )
        .bind(&new_provider.id)
        .bind(&new_provider.provider_kind)
        .bind(&new_provider.name)
        .bind(&new_provider.endpoint_url)
        .bind(&new_provider.region)
        .bind(&new_provider.bucket)
        .bind(new_provider.path_style)
        .bind(&new_provider.credential_ref)
        .bind(&new_provider.server_side_encryption_mode)
        .bind(&new_provider.default_storage_class)
        .bind(&new_provider.status)
        .bind(&new_provider.created_by)
        .bind(&new_provider.updated_by)
        .execute(&self.pool)
        .await;

        if let Err(error) = result {
            let message = error.to_string();
            if message.contains("UNIQUE constraint failed") {
                return Err(DriveProductError::Conflict(
                    "storage provider already exists".to_string(),
                ));
            }
            return Err(DriveProductError::Internal(format!(
                "insert drive_storage_provider failed: {message}"
            )));
        }

        let row = sqlx::query(
            "SELECT id, provider_kind, name, endpoint_url, region, bucket, path_style,
                    credential_ref, server_side_encryption_mode, default_storage_class,
                    status, version
             FROM drive_storage_provider
             WHERE id=?1",
        )
        .bind(&new_provider.id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "read inserted drive_storage_provider failed: {error}"
            ))
        })?;

        map_row_to_storage_provider(&row)
    }

    async fn list_storage_providers(
        &self,
        status: Option<&str>,
    ) -> Result<Vec<DriveStorageProvider>, DriveProductError> {
        let rows = match status {
            Some(status_value) if !status_value.trim().is_empty() => sqlx::query(
                "SELECT id, provider_kind, name, endpoint_url, region, bucket, path_style,
                        credential_ref, server_side_encryption_mode, default_storage_class,
                        status, version
                     FROM drive_storage_provider
                     WHERE status=?1
                     ORDER BY id ASC",
            )
            .bind(status_value.trim())
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!(
                    "list drive_storage_provider by status failed: {error}"
                ))
            })?,
            _ => sqlx::query(
                "SELECT id, provider_kind, name, endpoint_url, region, bucket, path_style,
                        credential_ref, server_side_encryption_mode, default_storage_class,
                        status, version
                     FROM drive_storage_provider
                     ORDER BY id ASC",
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!("list drive_storage_provider failed: {error}"))
            })?,
        };

        rows.iter().map(map_row_to_storage_provider).collect()
    }

    async fn find_storage_provider(
        &self,
        provider_id: &str,
    ) -> Result<Option<DriveStorageProvider>, DriveProductError> {
        let row = sqlx::query(
            "SELECT id, provider_kind, name, endpoint_url, region, bucket, path_style,
                    credential_ref, server_side_encryption_mode, default_storage_class,
                    status, version
             FROM drive_storage_provider
             WHERE id=?1",
        )
        .bind(provider_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("find drive_storage_provider failed: {error}"))
        })?;

        let Some(row) = row else {
            return Ok(None);
        };
        map_row_to_storage_provider(&row).map(Some)
    }

    async fn update_storage_provider(
        &self,
        provider_id: &str,
        patch: &UpdateDriveStorageProvider,
    ) -> Result<DriveStorageProvider, DriveProductError> {
        let updated = sqlx::query(
            "UPDATE drive_storage_provider
             SET name=?2,
                 endpoint_url=?3,
                 region=?4,
                 bucket=?5,
                 path_style=?6,
                 credential_ref=?7,
                 server_side_encryption_mode=?8,
                 default_storage_class=?9,
                 status=?10,
                 version=version + 1,
                 updated_by=?11,
                 updated_at=CURRENT_TIMESTAMP
             WHERE id=?1",
        )
        .bind(provider_id)
        .bind(&patch.name)
        .bind(&patch.endpoint_url)
        .bind(&patch.region)
        .bind(&patch.bucket)
        .bind(patch.path_style)
        .bind(&patch.credential_ref)
        .bind(&patch.server_side_encryption_mode)
        .bind(&patch.default_storage_class)
        .bind(&patch.status)
        .bind(&patch.updated_by)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("update drive_storage_provider failed: {error}"))
        })?;

        if updated.rows_affected() == 0 {
            return Err(DriveProductError::NotFound(
                "storage provider not found".to_string(),
            ));
        }

        let row = sqlx::query(
            "SELECT id, provider_kind, name, endpoint_url, region, bucket, path_style,
                    credential_ref, server_side_encryption_mode, default_storage_class,
                    status, version
             FROM drive_storage_provider
             WHERE id=?1",
        )
        .bind(provider_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "read updated drive_storage_provider failed: {error}"
            ))
        })?;

        map_row_to_storage_provider(&row)
    }

    async fn delete_storage_provider(&self, provider_id: &str) -> Result<bool, DriveProductError> {
        let deleted = sqlx::query("DELETE FROM drive_storage_provider WHERE id=?1")
            .bind(provider_id)
            .execute(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!(
                    "delete drive_storage_provider failed: {error}"
                ))
            })?;
        Ok(deleted.rows_affected() > 0)
    }
}

fn map_row_to_storage_provider(row: &SqliteRow) -> Result<DriveStorageProvider, DriveProductError> {
    let provider_kind_raw: String = row.get("provider_kind");
    let provider_kind =
        DriveStorageProviderKind::try_from_str(&provider_kind_raw).ok_or_else(|| {
            DriveProductError::Internal(format!(
                "storage provider kind is invalid: {provider_kind_raw}"
            ))
        })?;
    let status: String = row.get("status");
    if status.trim().is_empty() {
        return Err(DriveProductError::Internal(
            "storage provider status is empty".to_string(),
        ));
    }

    Ok(DriveStorageProvider {
        id: row.get("id"),
        provider_kind,
        name: row.get("name"),
        endpoint_url: row.get("endpoint_url"),
        region: row.get("region"),
        bucket: row.get("bucket"),
        path_style: row.get("path_style"),
        credential_ref: row.get("credential_ref"),
        server_side_encryption_mode: row.get("server_side_encryption_mode"),
        default_storage_class: row.get("default_storage_class"),
        status,
        version: row.get("version"),
    })
}
