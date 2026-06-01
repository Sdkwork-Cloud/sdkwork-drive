use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::domain::maintenance::DriveSweepResult;
use crate::domain::maintenance_job::DriveMaintenanceJob;
use crate::ports::maintenance_store::{
    DriveMaintenanceStore, ListMaintenanceJobsQuery, MaintenanceJobPage, NewDriveMaintenanceJob,
    SweepDeletedObjectsQuery, SweepExpiredUploadSessionsQuery,
};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct SqlMaintenanceStore {
    pool: SqlitePool,
}

impl SqlMaintenanceStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveMaintenanceStore for SqlMaintenanceStore {
    async fn sweep_deleted_objects(
        &self,
        query: &SweepDeletedObjectsQuery,
    ) -> Result<DriveSweepResult, DriveProductError> {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM drive_storage_object
             WHERE lifecycle_status='deleted'",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "count deleted drive_storage_object failed: {error}"
            ))
        })?;
        let scanned_count = total.min(query.limit);

        let affected_count = if query.dry_run || scanned_count == 0 {
            0
        } else {
            sqlx::query(
                "DELETE FROM drive_storage_object
                 WHERE id IN (
                     SELECT id
                     FROM drive_storage_object
                     WHERE lifecycle_status='deleted'
                     ORDER BY id ASC
                     LIMIT ?1
                 )",
            )
            .bind(query.limit)
            .execute(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!(
                    "delete deleted drive_storage_object failed: {error}"
                ))
            })?
            .rows_affected() as i64
        };

        Ok(DriveSweepResult {
            scanned_count,
            affected_count,
            dry_run: query.dry_run,
        })
    }

    async fn sweep_expired_upload_sessions(
        &self,
        query: &SweepExpiredUploadSessionsQuery,
    ) -> Result<DriveSweepResult, DriveProductError> {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM drive_upload_session
             WHERE state IN ('created', 'uploading')
               AND expires_at_epoch_ms < ?1",
        )
        .bind(query.now_epoch_ms)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "count expired drive_upload_session failed: {error}"
            ))
        })?;
        let scanned_count = total.min(query.limit);

        let affected_count = if query.dry_run || scanned_count == 0 {
            0
        } else {
            sqlx::query(
                "UPDATE drive_upload_session
                 SET state='expired',
                     version=version + 1,
                     updated_at=CURRENT_TIMESTAMP
                 WHERE id IN (
                     SELECT id
                     FROM drive_upload_session
                     WHERE state IN ('created', 'uploading')
                       AND expires_at_epoch_ms < ?1
                     ORDER BY expires_at_epoch_ms ASC
                     LIMIT ?2
                 )",
            )
            .bind(query.now_epoch_ms)
            .bind(query.limit)
            .execute(&self.pool)
            .await
            .map_err(|error| {
                DriveProductError::Internal(format!(
                    "update expired drive_upload_session failed: {error}"
                ))
            })?
            .rows_affected() as i64
        };

        Ok(DriveSweepResult {
            scanned_count,
            affected_count,
            dry_run: query.dry_run,
        })
    }

    async fn insert_maintenance_job(
        &self,
        new_job: &NewDriveMaintenanceJob,
    ) -> Result<DriveMaintenanceJob, DriveProductError> {
        let result = sqlx::query(
            "INSERT INTO drive_maintenance_job (
                job_type, status, dry_run, scanned_count, affected_count,
                operator_id, request_id, trace_id, error_message,
                started_at, finished_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        )
        .bind(&new_job.job_type)
        .bind(&new_job.status)
        .bind(new_job.dry_run)
        .bind(new_job.scanned_count)
        .bind(new_job.affected_count)
        .bind(&new_job.operator_id)
        .bind(&new_job.request_id)
        .bind(&new_job.trace_id)
        .bind(&new_job.error_message)
        .execute(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("insert drive_maintenance_job failed: {error}"))
        })?;

        let row = sqlx::query(
            "SELECT id, job_type, status, dry_run, scanned_count, affected_count,
                    operator_id, request_id, trace_id, error_message,
                    strftime('%Y-%m-%dT%H:%M:%fZ', started_at) AS started_at,
                    strftime('%Y-%m-%dT%H:%M:%fZ', finished_at) AS finished_at,
                    strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
             FROM drive_maintenance_job
             WHERE id=?1",
        )
        .bind(result.last_insert_rowid())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!(
                "read inserted drive_maintenance_job failed: {error}"
            ))
        })?;
        map_row_to_maintenance_job(&row)
    }

    async fn list_maintenance_jobs(
        &self,
        query: &ListMaintenanceJobsQuery,
    ) -> Result<MaintenanceJobPage, DriveProductError> {
        let offset = i64::from((query.page - 1) * query.page_size);
        let limit = i64::from(query.page_size);

        let rows = sqlx::query(
            "SELECT id, job_type, status, dry_run, scanned_count, affected_count,
                    operator_id, request_id, trace_id, error_message,
                    strftime('%Y-%m-%dT%H:%M:%fZ', started_at) AS started_at,
                    strftime('%Y-%m-%dT%H:%M:%fZ', finished_at) AS finished_at,
                    strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at
             FROM drive_maintenance_job
             WHERE (?1 IS NULL OR job_type = ?1)
               AND (?2 IS NULL OR status = ?2)
               AND (?3 IS NULL OR operator_id = ?3)
             ORDER BY id DESC
             LIMIT ?4 OFFSET ?5",
        )
        .bind(query.job_type.as_deref())
        .bind(query.status.as_deref())
        .bind(query.operator_id.as_deref())
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("list drive_maintenance_job failed: {error}"))
        })?;

        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(1)
             FROM drive_maintenance_job
             WHERE (?1 IS NULL OR job_type = ?1)
               AND (?2 IS NULL OR status = ?2)
               AND (?3 IS NULL OR operator_id = ?3)",
        )
        .bind(query.job_type.as_deref())
        .bind(query.status.as_deref())
        .bind(query.operator_id.as_deref())
        .fetch_one(&self.pool)
        .await
        .map_err(|error| {
            DriveProductError::Internal(format!("count drive_maintenance_job failed: {error}"))
        })?;

        let items = rows
            .iter()
            .map(map_row_to_maintenance_job)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(MaintenanceJobPage {
            items,
            page: query.page,
            page_size: query.page_size,
            total,
        })
    }
}

fn map_row_to_maintenance_job(row: &SqliteRow) -> Result<DriveMaintenanceJob, DriveProductError> {
    let job_type: String = row.get("job_type");
    if job_type.trim().is_empty() {
        return Err(DriveProductError::Internal(
            "drive_maintenance_job.job_type is empty".to_string(),
        ));
    }
    let status: String = row.get("status");
    if status.trim().is_empty() {
        return Err(DriveProductError::Internal(
            "drive_maintenance_job.status is empty".to_string(),
        ));
    }

    Ok(DriveMaintenanceJob {
        id: row.get("id"),
        job_type,
        status,
        dry_run: row.get("dry_run"),
        scanned_count: row.get("scanned_count"),
        affected_count: row.get("affected_count"),
        operator_id: row.get("operator_id"),
        request_id: row.get("request_id"),
        trace_id: row.get("trace_id"),
        error_message: row.get("error_message"),
        started_at: row.get("started_at"),
        finished_at: row.get("finished_at"),
        created_at: row.get("created_at"),
    })
}
