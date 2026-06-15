use crate::dto::{CommentRecord, CommentReplyRecord, ShareLinkRecord};
use crate::error::{internal_sql_error, not_found_problem, ProblemDetail};
use crate::mappers::{map_comment_reply_row, map_comment_row, map_share_link_record};
use axum::http::StatusCode;
use axum::Json;
use sqlx::AnyPool;

pub(crate) async fn find_comment(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
    comment_id: &str,
) -> Result<CommentRecord, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, content, anchor, resolved, lifecycle_status,
                version, created_by, updated_by, created_at, updated_at
         FROM dr_drive_node_comment
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(node_id)
    .bind(comment_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_comment failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("comment not found"));
    };
    Ok(map_comment_row(&row))
}

pub(crate) async fn find_comment_reply(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
    comment_id: &str,
    reply_id: &str,
) -> Result<CommentReplyRecord, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, comment_id, content, lifecycle_status,
                version, created_by, updated_by, created_at, updated_at
         FROM dr_drive_node_comment_reply
         WHERE tenant_id=$1
           AND node_id=$2
           AND comment_id=$3
           AND id=$4
           AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(node_id)
    .bind(comment_id)
    .bind(reply_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error(
        "find dr_drive_node_comment_reply failed",
    ))?;
    let Some(row) = row else {
        return Err(not_found_problem("comment reply not found"));
    };
    Ok(map_comment_reply_row(&row))
}

pub(crate) async fn find_share_link(
    pool: &AnyPool,
    tenant_id: &str,
    share_link_id: &str,
) -> Result<ShareLinkRecord, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, role, expires_at_epoch_ms, download_limit,
                download_count, lifecycle_status, version
         FROM dr_drive_node_share_link
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status != 'deleted'",
    )
    .bind(tenant_id)
    .bind(share_link_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_share_link failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("share link not found"));
    };
    Ok(map_share_link_record(&row))
}
