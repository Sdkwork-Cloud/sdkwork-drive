use crate::dto::DriveWatchChannelResponse;
use crate::error::{internal_sql_error, not_found_problem, ProblemDetail};
use crate::mappers::map_watch_channel_row;
use axum::http::StatusCode;
use axum::Json;
use sqlx::AnyPool;

pub(crate) async fn find_watch_channel(
    pool: &AnyPool,
    tenant_id: &str,
    channel_id: &str,
) -> Result<DriveWatchChannelResponse, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, space_id, node_id, resource_type, resource_id,
                channel_type, address, expiration_epoch_ms, lifecycle_status, version
         FROM dr_drive_watch_channel
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(tenant_id)
    .bind(channel_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_watch_channel failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("watch channel not found"));
    };
    Ok(map_watch_channel_row(&row))
}
