use crate::app_context::DriveRequestContext;
use crate::dto::{ChangeResponse, DriveWatchChannelResponse, PageRequest};
use crate::error::{internal_sql_error, map_service_error, problem, ProblemDetail};
use crate::node_repository::find_node;
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::application::permission_service::SqlDrivePermissionService;
use sdkwork_drive_workspace_service::ports::permission_store::{
    DriveEffectiveNodeAccess, ResolveEffectiveNodeAccessCommand,
};
use sqlx::AnyPool;
use sqlx::Row;
use sqlx::any::AnyRow;
use std::collections::BTreeSet;
use std::future::Future;

pub(crate) fn permission_denied_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::FORBIDDEN,
        "permission denied",
        "subject does not have required access to the drive node",
        "drive.permission_denied",
    )
}

pub(crate) async fn ensure_subject_role(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    node_id: &str,
    subject_type: &str,
    subject_id: &str,
    required_role: &str,
) -> Result<DriveEffectiveNodeAccess, (StatusCode, Json<ProblemDetail>)> {
    let service = SqlDrivePermissionService::new(pool.clone());
    let access = service
        .resolve_effective_node_access(ResolveEffectiveNodeAccessCommand {
            tenant_id: tenant_id.to_string(),
            space_id: space_id.to_string(),
            node_id: node_id.to_string(),
            subject_type: subject_type.to_string(),
            subject_id: subject_id.to_string(),
        })
        .await
        .map_err(map_service_error)?;
    if !access.allows_role(required_role) {
        return Err(permission_denied_problem());
    }
    Ok(access)
}

pub(crate) async fn ensure_ctx_node_role(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    space_id: &str,
    node_id: &str,
    required_role: &str,
) -> Result<DriveEffectiveNodeAccess, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;
    ensure_subject_role(
        pool,
        &tenant_id,
        space_id,
        node_id,
        &subject_type,
        &subject_id,
        required_role,
    )
    .await
}

pub(crate) async fn ensure_list_parent_reader(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    space_id: &str,
    parent_node_id: Option<&str>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;
    let service = SqlDrivePermissionService::new(pool.clone());
    if service
        .is_space_owner(&tenant_id, space_id, &subject_type, &subject_id)
        .await
        .map_err(map_service_error)?
    {
        return Ok(());
    }

    let anchor_node_id = match parent_node_id {
        Some(parent_id) => parent_id.to_string(),
        None => service
            .resolve_space_permission_anchor_node(&tenant_id, space_id)
            .await
            .map_err(map_service_error)?,
    };

    ensure_subject_role(
        pool,
        &tenant_id,
        space_id,
        &anchor_node_id,
        &subject_type,
        &subject_id,
        "reader",
    )
    .await?;
    Ok(())
}

pub(crate) async fn ensure_parent_writer(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    space_id: &str,
    parent_node_id: Option<&str>,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;
    let service = SqlDrivePermissionService::new(pool.clone());
    if service
        .is_space_owner(&tenant_id, space_id, &subject_type, &subject_id)
        .await
        .map_err(map_service_error)?
    {
        return Ok(());
    }
    let anchor_node_id = match parent_node_id {
        Some(parent_id) => parent_id.to_string(),
        None => SqlDrivePermissionService::new(pool.clone())
            .resolve_space_permission_anchor_node(&tenant_id, space_id)
            .await
            .map_err(map_service_error)?,
    };
    ensure_subject_role(
        pool,
        &tenant_id,
        space_id,
        &anchor_node_id,
        &subject_type,
        &subject_id,
        "writer",
    )
    .await?;
    Ok(())
}

async fn is_space_owner_any_lifecycle(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    subject_type: &str,
    subject_id: &str,
) -> Result<bool, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT owner_subject_type, owner_subject_id
         FROM dr_drive_space
         WHERE tenant_id = $1 AND id = $2",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("read dr_drive_space owner failed"))?;
    Ok(row.is_some_and(|row| {
        row.get::<String, _>("owner_subject_type") == subject_type
            && row.get::<String, _>("owner_subject_id") == subject_id
    }))
}

pub(crate) async fn ensure_space_change_feed_reader(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    space_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;
    if is_space_owner_any_lifecycle(
        pool,
        &tenant_id,
        space_id,
        &subject_type,
        &subject_id,
    )
    .await?
    {
        return Ok(());
    }
    ensure_list_parent_reader(pool, ctx, space_id, None).await
}

pub(crate) async fn ensure_watch_channel_role(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    channel: &DriveWatchChannelResponse,
    required_role: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    if let Some(node_id) = channel.node_id.as_deref() {
        let node = find_node(pool, &tenant_id, node_id).await?;
        ensure_ctx_node_role(pool, ctx, &node.space_id, node_id, required_role).await?;
        return Ok(());
    }
    let space_id = channel.space_id.as_deref().ok_or_else(|| {
        problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal error",
            "watch channel is missing space scope",
            "drive.internal_error",
        )
    })?;
    if required_role == "reader" || required_role == "commenter" {
        ensure_list_parent_reader(pool, ctx, space_id, None).await
    } else {
        ensure_parent_writer(pool, ctx, space_id, None).await
    }
}

pub(crate) async fn ensure_node_ids_role(
    pool: &AnyPool,
    ctx: &DriveRequestContext,
    node_ids: &[String],
    required_role: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let mut seen = BTreeSet::new();
    for node_id in node_ids {
        if !seen.insert(node_id.as_str()) {
            continue;
        }
        let node = find_node(pool, &tenant_id, node_id).await?;
        ensure_ctx_node_role(pool, ctx, &node.space_id, node_id, required_role).await?;
    }
    Ok(())
}

pub(crate) async fn paginate_reader_visible_items<T, F, Fut>(
    pool: &AnyPool,
    tenant_id: &str,
    subject_type: &str,
    subject_id: &str,
    page: crate::dto::PageRequest,
    mut fetch_batch: F,
    map_row: fn(&AnyRow) -> T,
    node_scope: fn(&T) -> (String, String),
) -> Result<(Vec<T>, Option<String>), (StatusCode, Json<ProblemDetail>)>
where
    F: FnMut(i64, usize) -> Fut,
    Fut: Future<Output = Result<Vec<AnyRow>, (StatusCode, Json<ProblemDetail>)>>,
{
    let batch_limit = (page.limit + 1) as usize;
    let max_scan_rows = (page.limit.saturating_mul(20).max(page.limit + 1)) as usize;
    let mut items = Vec::new();
    let mut scan_offset = page.offset;
    let mut scanned_rows = 0usize;
    let mut has_more_in_db = false;

    while (items.len() as i64) <= page.limit && scanned_rows < max_scan_rows {
        let rows = fetch_batch(scan_offset, batch_limit).await?;
        if rows.is_empty() {
            has_more_in_db = false;
            break;
        }

        scanned_rows += rows.len();
        scan_offset += rows.len() as i64;
        has_more_in_db = rows.len() == batch_limit;

        for row in rows {
            let item = map_row(&row);
            let (space_id, node_id) = node_scope(&item);
            if ensure_subject_role(
                pool,
                tenant_id,
                &space_id,
                &node_id,
                subject_type,
                subject_id,
                "reader",
            )
            .await
            .is_ok()
            {
                items.push(item);
                if (items.len() as i64) > page.limit {
                    break;
                }
            }
        }

        if (items.len() as i64) > page.limit {
            break;
        }
    }

    let next_page_token = if (items.len() as i64) > page.limit {
        let overflow = items.len() - page.limit as usize;
        items.truncate(page.limit as usize);
        Some((scan_offset - overflow as i64).to_string())
    } else if has_more_in_db {
        Some(scan_offset.to_string())
    } else {
        None
    };

    Ok((items, next_page_token))
}

fn map_change_row(row: &AnyRow) -> ChangeResponse {
    ChangeResponse {
        sequence_no: row.get("sequence_no"),
        tenant_id: row.get("tenant_id"),
        space_id: row.get("space_id"),
        node_id: row.get("node_id"),
        event_type: row.get("event_type"),
        actor_id: row.get("actor_id"),
        created_at: row.get("created_at"),
    }
}

pub(crate) async fn paginate_reader_visible_changes<F, Fut>(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    subject_type: &str,
    subject_id: &str,
    page: PageRequest,
    mut fetch_batch: F,
) -> Result<(Vec<ChangeResponse>, Option<String>), (StatusCode, Json<ProblemDetail>)>
where
    F: FnMut(i64, usize) -> Fut,
    Fut: Future<Output = Result<Vec<AnyRow>, (StatusCode, Json<ProblemDetail>)>>,
{
    let batch_limit = (page.limit + 1) as usize;
    let max_scan_rows = (page.limit.saturating_mul(20).max(page.limit + 1)) as usize;
    let mut items = Vec::new();
    let mut scan_cursor = page.offset;
    let mut scanned_rows = 0usize;
    let mut has_more_in_db = false;

    while (items.len() as i64) <= page.limit && scanned_rows < max_scan_rows {
        let rows = fetch_batch(scan_cursor, batch_limit).await?;
        if rows.is_empty() {
            has_more_in_db = false;
            break;
        }

        scanned_rows += rows.len();
        has_more_in_db = rows.len() == batch_limit;

        for row in rows {
            let item = map_change_row(&row);
            scan_cursor = item.sequence_no;
            let visible = match item.node_id.as_deref() {
                None => true,
                Some(node_id) => {
                    ensure_subject_role(
                        pool,
                        tenant_id,
                        space_id,
                        node_id,
                        subject_type,
                        subject_id,
                        "reader",
                    )
                    .await
                    .is_ok()
                }
            };
            if visible {
                items.push(item);
                if (items.len() as i64) > page.limit {
                    break;
                }
            }
        }

        if (items.len() as i64) > page.limit {
            break;
        }
    }

    let next_page_token = if (items.len() as i64) > page.limit {
        items.pop();
        items.last().map(|item| item.sequence_no.to_string())
    } else if has_more_in_db {
        Some(scan_cursor.to_string())
    } else {
        None
    };

    Ok((items, next_page_token))
}
