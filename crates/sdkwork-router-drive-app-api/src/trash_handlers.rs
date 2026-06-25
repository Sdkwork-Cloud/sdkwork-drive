use crate::acl;
use crate::acl_sql;
use crate::app_context::DriveRequestContext;
use crate::dto::{
    DriveNodeResponse, EmptyTrashRequest, EmptyTrashResponse, NodeCommandRequest,
    NodeListResponse, NodeViewQuery,
};
use crate::error::{internal_sql_error, ProblemDetail};
use crate::mappers::map_node_row;
use crate::metadata_repository::present_node_list;
use crate::node_lifecycle::set_node_lifecycle;
use crate::node_repository::find_node;
use crate::route_change::record_change;
use crate::space_repository::validate_space_exists;
use crate::state::AppState;
use crate::validators::{normalize_optional_text, parse_page_request};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use sdkwork_drive_contract::drive::domain_events as drive_events;
use sdkwork_drive_workspace_service::infrastructure::sql::NODE_API_SELECT_COLUMNS;
use sqlx::Row;

pub(crate) async fn trash_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_node_lifecycle(state, &ctx, node_id, payload, "trashed", drive_events::node::TRASHED).await
}
pub(crate) async fn restore_trashed_node(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<NodeCommandRequest>,
) -> Result<Json<DriveNodeResponse>, (StatusCode, Json<ProblemDetail>)> {
    set_node_lifecycle(state, &ctx, node_id, payload, "active", drive_events::node::RESTORED).await
}
pub(crate) async fn list_trashed_nodes(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Query(query): Query<NodeViewQuery>,
) -> Result<Json<NodeListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let parent_node_id = normalize_optional_text(query.parent_node_id);
    let space_id = normalize_optional_text(query.space_id);
    let (subject_type, subject_id) = ctx.resolve_subject(None, None)?;
    if let Some(space_id) = space_id.as_deref() {
        validate_space_exists(&state.pool, &tenant_id, space_id).await?;
        acl::ensure_list_parent_reader(&state.pool, &ctx, space_id, parent_node_id.as_deref())
            .await?;
    }
    if let Some(parent_node_id) = parent_node_id.as_deref() {
        let node = find_node(&state.pool, &tenant_id, parent_node_id).await?;
        acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, parent_node_id, "reader")
            .await?;
    }
    let pool = state.pool.clone();
    let tenant_id_for_fetch = tenant_id.clone();
    let space_id_for_fetch = space_id.clone();
    let parent_node_id_for_fetch = parent_node_id.clone();
    let subject_type_for_fetch = subject_type.clone();
    let subject_id_for_fetch = subject_id.clone();

    let (items, next_page_token, incomplete_page) = if let Some(space_id) = space_id.clone() {
        let is_space_owner = acl::is_subject_space_owner(
            &state.pool,
            &tenant_id,
            &space_id,
            &subject_type,
            &subject_id,
        )
        .await?;
        let reader_acl_predicate = acl_sql::reader_inherited_permission_exists_sql(
            "dr_drive_node",
            if parent_node_id.is_some() { "$4" } else { "$3" },
            if parent_node_id.is_some() { "$5" } else { "$4" },
        );
        let (items, next_page_token) = if is_space_owner {
            acl::paginate_offset_limited_items(
                page,
                move |scan_offset, batch_limit| {
                    let pool = pool.clone();
                    let tenant_id = tenant_id_for_fetch.clone();
                    let space_id = space_id.clone();
                    let parent_node_id = parent_node_id_for_fetch.clone();
                    async move {
                        let rows = if let Some(parent_node_id) = parent_node_id.as_deref() {
                            sqlx::query(&format!(
                                "SELECT {NODE_API_SELECT_COLUMNS}
                                 FROM dr_drive_node
                                 WHERE tenant_id=$1
                                   AND space_id=$2
                                   AND lifecycle_status='trashed'
                                   AND parent_node_id=$3
                                 ORDER BY updated_at DESC, id ASC
                                 LIMIT $4 OFFSET $5",
                            ))
                            .bind(&tenant_id)
                            .bind(&space_id)
                            .bind(parent_node_id)
                            .bind(batch_limit as i64)
                            .bind(scan_offset)
                            .fetch_all(&pool)
                            .await
                        } else {
                            sqlx::query(&format!(
                                "SELECT {NODE_API_SELECT_COLUMNS}
                                 FROM dr_drive_node
                                 WHERE tenant_id=$1
                                   AND space_id=$2
                                   AND lifecycle_status='trashed'
                                 ORDER BY updated_at DESC, id ASC
                                 LIMIT $3 OFFSET $4",
                            ))
                            .bind(&tenant_id)
                            .bind(&space_id)
                            .bind(batch_limit as i64)
                            .bind(scan_offset)
                            .fetch_all(&pool)
                            .await
                        }
                        .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;
                        Ok(rows)
                    }
                },
                map_node_row,
            )
            .await?
        } else if let Some(parent_node_id) = parent_node_id_for_fetch.clone() {
            acl::paginate_offset_limited_items(
                page,
                move |scan_offset, batch_limit| {
                    let pool = pool.clone();
                    let tenant_id = tenant_id_for_fetch.clone();
                    let space_id = space_id.clone();
                    let parent_node_id = parent_node_id.clone();
                    let subject_type = subject_type_for_fetch.clone();
                    let subject_id = subject_id_for_fetch.clone();
                    let reader_acl_predicate = reader_acl_predicate.clone();
                    async move {
                        let rows = sqlx::query(&format!(
                            "SELECT {NODE_API_SELECT_COLUMNS}
                             FROM dr_drive_node
                             WHERE tenant_id=$1
                               AND space_id=$2
                               AND lifecycle_status='trashed'
                               AND parent_node_id=$3
                               AND ({reader_acl_predicate})
                             ORDER BY updated_at DESC, id ASC
                             LIMIT $6 OFFSET $7",
                        ))
                        .bind(&tenant_id)
                        .bind(&space_id)
                        .bind(parent_node_id)
                        .bind(&subject_type)
                        .bind(&subject_id)
                        .bind(batch_limit as i64)
                        .bind(scan_offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;
                        Ok(rows)
                    }
                },
                map_node_row,
            )
            .await?
        } else {
            acl::paginate_offset_limited_items(
                page,
                move |scan_offset, batch_limit| {
                    let pool = pool.clone();
                    let tenant_id = tenant_id_for_fetch.clone();
                    let space_id = space_id.clone();
                    let subject_type = subject_type_for_fetch.clone();
                    let subject_id = subject_id_for_fetch.clone();
                    let reader_acl_predicate = reader_acl_predicate.clone();
                    async move {
                        let rows = sqlx::query(&format!(
                            "SELECT {NODE_API_SELECT_COLUMNS}
                             FROM dr_drive_node
                             WHERE tenant_id=$1
                               AND space_id=$2
                               AND lifecycle_status='trashed'
                               AND ({reader_acl_predicate})
                             ORDER BY updated_at DESC, id ASC
                             LIMIT $5 OFFSET $6",
                        ))
                        .bind(&tenant_id)
                        .bind(&space_id)
                        .bind(&subject_type)
                        .bind(&subject_id)
                        .bind(batch_limit as i64)
                        .bind(scan_offset)
                        .fetch_all(&pool)
                        .await
                        .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;
                        Ok(rows)
                    }
                },
                map_node_row,
            )
            .await?
        };
        (items, next_page_token, false)
    } else {
        acl::paginate_reader_visible_items(
            &state.pool,
            &tenant_id,
            &subject_type,
            &subject_id,
            page,
            move |scan_offset, batch_limit| {
                let pool = pool.clone();
                let tenant_id = tenant_id_for_fetch.clone();
                let space_id = space_id_for_fetch.clone();
                let parent_node_id = parent_node_id_for_fetch.clone();
                async move {
                    let rows = if let Some(space_id) = space_id.as_deref() {
                        if let Some(parent_node_id) = parent_node_id.as_deref() {
                            sqlx::query(&format!(
                                "SELECT {NODE_API_SELECT_COLUMNS}
                                 FROM dr_drive_node
                                 WHERE tenant_id=$1
                                   AND space_id=$2
                                   AND lifecycle_status='trashed'
                                   AND parent_node_id=$3
                                 ORDER BY updated_at DESC, id ASC
                                 LIMIT $4 OFFSET $5",
                            ))
                            .bind(&tenant_id)
                            .bind(space_id)
                            .bind(parent_node_id)
                            .bind(batch_limit as i64)
                            .bind(scan_offset)
                            .fetch_all(&pool)
                            .await
                        } else {
                            sqlx::query(&format!(
                                "SELECT {NODE_API_SELECT_COLUMNS}
                                 FROM dr_drive_node
                                 WHERE tenant_id=$1 AND space_id=$2 AND lifecycle_status='trashed'
                                 ORDER BY updated_at DESC, id ASC
                                 LIMIT $3 OFFSET $4",
                            ))
                            .bind(&tenant_id)
                            .bind(space_id)
                            .bind(batch_limit as i64)
                            .bind(scan_offset)
                            .fetch_all(&pool)
                            .await
                        }
                    } else if let Some(parent_node_id) = parent_node_id.as_deref() {
                        sqlx::query(&format!(
                            "SELECT {NODE_API_SELECT_COLUMNS}
                             FROM dr_drive_node
                             WHERE tenant_id=$1
                               AND lifecycle_status='trashed'
                               AND parent_node_id=$2
                             ORDER BY updated_at DESC, id ASC
                             LIMIT $3 OFFSET $4",
                        ))
                        .bind(&tenant_id)
                        .bind(parent_node_id)
                        .bind(batch_limit as i64)
                        .bind(scan_offset)
                        .fetch_all(&pool)
                        .await
                    } else {
                        sqlx::query(&format!(
                            "SELECT {NODE_API_SELECT_COLUMNS}
                             FROM dr_drive_node
                             WHERE tenant_id=$1 AND lifecycle_status='trashed'
                             ORDER BY updated_at DESC, id ASC
                             LIMIT $2 OFFSET $3",
                        ))
                        .bind(&tenant_id)
                        .bind(batch_limit as i64)
                        .bind(scan_offset)
                        .fetch_all(&pool)
                        .await
                    }
                    .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;
                    Ok(rows)
                }
            },
            map_node_row,
            |item| (item.space_id.clone(), item.id.clone()),
        )
        .await?
    };

    Ok(Json(
        present_node_list(
            &state.pool,
            &tenant_id,
            items,
            next_page_token,
            incomplete_page,
        )
        .await?,
    ))
}
pub(crate) async fn empty_trash(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Json(payload): Json<EmptyTrashRequest>,
) -> Result<Json<EmptyTrashResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let space_id = normalize_optional_text(payload.space_id);
    let trashed_rows = if let Some(space_id_value) = space_id.as_deref() {
        validate_space_exists(&state.pool, &tenant_id, space_id_value).await?;
        sqlx::query(
            "SELECT id, space_id
             FROM dr_drive_node
             WHERE tenant_id=$1 AND space_id=$2 AND lifecycle_status='trashed'
             ORDER BY updated_at ASC
             LIMIT 500",
        )
        .bind(&tenant_id)
        .bind(space_id_value)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, space_id
             FROM dr_drive_node
             WHERE tenant_id=$1 AND lifecycle_status='trashed'
             ORDER BY updated_at ASC
             LIMIT 500",
        )
        .bind(&tenant_id)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list trashed dr_drive_node failed"))?;

    let mut deleted_count = 0_i64;
    let mut changed_spaces = Vec::<String>::new();
    for row in &trashed_rows {
        let node_id: String = row.get("id");
        let space_id_value: String = row.get("space_id");
        if acl::ensure_ctx_node_role(&state.pool, &ctx, &space_id_value, &node_id, "writer")
            .await
            .is_err()
        {
            continue;
        }
        sqlx::query(
            "UPDATE dr_drive_node
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$2 AND id=$3 AND lifecycle_status='trashed'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error("empty trash dr_drive_node failed"))?;

        sqlx::query(
            "UPDATE dr_drive_storage_object
             SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP
             WHERE tenant_id=$2 AND node_id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&node_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error(
            "empty trash dr_drive_storage_object metadata failed",
        ))?;
        deleted_count += 1;
        if !changed_spaces.contains(&space_id_value) {
            changed_spaces.push(space_id_value);
        }
    }
    for space_id_value in changed_spaces {
        record_change(
            &state.pool,
            &tenant_id,
            &space_id_value,
            None,
            drive_events::trash::EMPTIED,
            &operator_id,
        )
        .await?;
    }

    Ok(Json(EmptyTrashResponse { deleted_count }))
}
