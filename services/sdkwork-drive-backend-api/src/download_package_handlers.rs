use crate::dto::{DownloadPackagePageResponse, ListDownloadPackagesQuery};
use crate::error::{internal_sql_error, ProblemDetail};
use crate::mappers::map_download_package_row;
use crate::state::BackendState;
use crate::validators::{
    normalize_optional_text, validate_download_package_state, validate_page_size_u32,
    validate_page_u32,
};
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;

pub(crate) async fn list_download_packages(
    State(state): State<BackendState>,
    Query(query): Query<ListDownloadPackagesQuery>,
) -> Result<Json<DownloadPackagePageResponse>, (StatusCode, Json<ProblemDetail>)> {
    let page = validate_page_u32(query.page, 1, 1, 10_000, "page")?;
    let page_size = validate_page_size_u32(query.page_size, 50, 1, 100, "pageSize")?;
    let offset = i64::from(page - 1) * i64::from(page_size);
    let tenant_id = normalize_optional_text(query.tenant_id);
    let state_filter = match normalize_optional_text(query.state) {
        Some(state) => {
            validate_download_package_state(&state)?;
            Some(state)
        }
        None => None,
    };

    let total: i64 = match (tenant_id.as_deref(), state_filter.as_deref()) {
        (Some(tenant_id), Some(state_filter)) => {
            sqlx::query_scalar(
                "SELECT COUNT(1)
             FROM dr_drive_download_package
             WHERE tenant_id=$1 AND state=$2",
            )
            .bind(tenant_id)
            .bind(state_filter)
            .fetch_one(&state.pool)
            .await
        }
        (Some(tenant_id), None) => {
            sqlx::query_scalar(
                "SELECT COUNT(1)
             FROM dr_drive_download_package
             WHERE tenant_id=$1",
            )
            .bind(tenant_id)
            .fetch_one(&state.pool)
            .await
        }
        (None, Some(state_filter)) => {
            sqlx::query_scalar(
                "SELECT COUNT(1)
             FROM dr_drive_download_package
             WHERE state=$1",
            )
            .bind(state_filter)
            .fetch_one(&state.pool)
            .await
        }
        (None, None) => {
            sqlx::query_scalar("SELECT COUNT(1) FROM dr_drive_download_package")
                .fetch_one(&state.pool)
                .await
        }
    }
    .map_err(internal_sql_error("count dr_drive_download_package failed"))?;

    let rows = match (tenant_id.as_deref(), state_filter.as_deref()) {
        (Some(tenant_id), Some(state_filter)) => {
            sqlx::query(
                "SELECT id, tenant_id, package_name, state, storage_provider_id,
                    bucket, archive_object_key, content_type, file_count,
                    total_bytes, archive_size_bytes, expires_at_epoch_ms,
                    error_message, created_by, updated_by, created_at, updated_at
             FROM dr_drive_download_package
             WHERE tenant_id=$1 AND state=$2
             ORDER BY created_at DESC, id ASC
             LIMIT $3 OFFSET $4",
            )
            .bind(tenant_id)
            .bind(state_filter)
            .bind(i64::from(page_size))
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (Some(tenant_id), None) => {
            sqlx::query(
                "SELECT id, tenant_id, package_name, state, storage_provider_id,
                    bucket, archive_object_key, content_type, file_count,
                    total_bytes, archive_size_bytes, expires_at_epoch_ms,
                    error_message, created_by, updated_by, created_at, updated_at
             FROM dr_drive_download_package
             WHERE tenant_id=$1
             ORDER BY created_at DESC, id ASC
             LIMIT $2 OFFSET $3",
            )
            .bind(tenant_id)
            .bind(i64::from(page_size))
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, Some(state_filter)) => {
            sqlx::query(
                "SELECT id, tenant_id, package_name, state, storage_provider_id,
                    bucket, archive_object_key, content_type, file_count,
                    total_bytes, archive_size_bytes, expires_at_epoch_ms,
                    error_message, created_by, updated_by, created_at, updated_at
             FROM dr_drive_download_package
             WHERE state=$1
             ORDER BY created_at DESC, id ASC
             LIMIT $2 OFFSET $3",
            )
            .bind(state_filter)
            .bind(i64::from(page_size))
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, None) => {
            sqlx::query(
                "SELECT id, tenant_id, package_name, state, storage_provider_id,
                    bucket, archive_object_key, content_type, file_count,
                    total_bytes, archive_size_bytes, expires_at_epoch_ms,
                    error_message, created_by, updated_by, created_at, updated_at
             FROM dr_drive_download_package
             ORDER BY created_at DESC, id ASC
             LIMIT $1 OFFSET $2",
            )
            .bind(i64::from(page_size))
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
    }
    .map_err(internal_sql_error("list dr_drive_download_package failed"))?;

    Ok(Json(DownloadPackagePageResponse {
        items: rows.iter().map(map_download_package_row).collect(),
        page,
        page_size,
        total,
    }))
}
