use crate::acl;
use crate::app_context::DriveRequestContext;
use crate::dto::{
    ApplyNodeLabelRequest, DeleteNodePropertyQuery, DeleteNodePropertyResponse, NodeLabelListQuery,
    NodeLabelListResponse, NodeLabelResponse, NodePropertyListQuery, NodePropertyListResponse,
    NodePropertyResponse, RemoveNodeLabelQuery, RemoveNodeLabelResponse, SetNodePropertyRequest,
};
use crate::error::{internal_sql_error, ProblemDetail};
use crate::hashing::sha256_raw_hex_separated;
use crate::mappers::{map_node_label_row, map_node_property_row};
use crate::metadata_repository::{find_label, find_node_label, find_node_property};
use crate::node_repository::{find_active_node, find_node};
use crate::route_change::record_change;
use crate::state::AppState;
use crate::validators::{
    next_page_token, normalize_optional_text, parse_page_request, require_non_empty_text,
    validate_label_key, validate_node_property_key, validate_node_property_visibility,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use sdkwork_drive_contract::drive::domain_events as drive_events;

pub(crate) async fn list_node_properties(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodePropertyListQuery>,
) -> Result<Json<NodePropertyListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "reader").await?;
    let visibility = match normalize_optional_text(query.visibility) {
        Some(value) => Some(validate_node_property_visibility(&value)?.to_string()),
        None => None,
    };

    let rows = if let Some(visibility) = visibility.as_deref() {
        sqlx::query(
            "SELECT id, tenant_id, node_id, property_key, property_value, visibility,
                    lifecycle_status, version
             FROM dr_drive_node_property
             WHERE tenant_id=$1
               AND node_id=$2
               AND visibility=$3
               AND lifecycle_status='active'
             ORDER BY property_key ASC, visibility ASC
             LIMIT $4 OFFSET $5",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(visibility)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT id, tenant_id, node_id, property_key, property_value, visibility,
                    lifecycle_status, version
             FROM dr_drive_node_property
             WHERE tenant_id=$1
               AND node_id=$2
               AND lifecycle_status='active'
             ORDER BY property_key ASC, visibility ASC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_node_property failed"))?;

    let mut items = rows.iter().map(map_node_property_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(NodePropertyListResponse {
        items,
        next_page_token,
    }))
}
pub(crate) async fn set_node_property(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, property_key)): Path<(String, String)>,
    Json(payload): Json<SetNodePropertyRequest>,
) -> Result<Json<NodePropertyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let property_key = validate_node_property_key(&property_key)?.to_string();
    let visibility = validate_node_property_visibility(
        normalize_optional_text(payload.visibility)
            .as_deref()
            .unwrap_or("private"),
    )?
    .to_string();
    let property_value = require_non_empty_text(payload.value, "value")?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "writer").await?;
    let property_id = build_node_property_id(&tenant_id, &node_id, &property_key, &visibility);

    sqlx::query(
        "INSERT INTO dr_drive_node_property (
            id, tenant_id, node_id, property_key, property_value, visibility,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 1, $7, $7)
         ON CONFLICT(tenant_id, node_id, property_key, visibility) DO UPDATE SET
            property_value=excluded.property_value,
            lifecycle_status='active',
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP,
            version=dr_drive_node_property.version + 1",
    )
    .bind(&property_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&property_key)
    .bind(&property_value)
    .bind(&visibility)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("upsert dr_drive_node_property failed"))?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        drive_events::node_property::SET,
        &operator_id,
    )
    .await?;

    Ok(Json(
        find_node_property(
            &state.pool,
            &tenant_id,
            &node_id,
            &property_key,
            &visibility,
        )
        .await?,
    ))
}
pub(crate) async fn delete_node_property(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, property_key)): Path<(String, String)>,
    Query(query): Query<DeleteNodePropertyQuery>,
) -> Result<Json<DeleteNodePropertyResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let property_key = validate_node_property_key(&property_key)?.to_string();
    let visibility = validate_node_property_visibility(
        normalize_optional_text(query.visibility)
            .as_deref()
            .unwrap_or("private"),
    )?
    .to_string();
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "writer").await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_property
         SET lifecycle_status='deleted',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2
           AND node_id=$3
           AND property_key=$4
           AND visibility=$5
           AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&property_key)
    .bind(&visibility)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_property failed"))?
    .rows_affected();

    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            drive_events::node_property::DELETED,
            &operator_id,
        )
        .await?;
    }

    Ok(Json(DeleteNodePropertyResponse {
        deleted: affected > 0,
    }))
}
pub(crate) async fn list_node_labels(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<NodeLabelListQuery>,
) -> Result<Json<NodeLabelListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "reader").await?;
    let label_key = match normalize_optional_text(query.label_key) {
        Some(label_key) => Some(validate_label_key(&label_key)?.to_string()),
        None => None,
    };

    let rows = if let Some(label_key) = label_key.as_deref() {
        sqlx::query(
            "SELECT nl.id, nl.tenant_id, nl.node_id, nl.label_id,
                    nl.lifecycle_status, nl.version,
                    l.label_key, l.display_name, l.color, l.description,
                    l.lifecycle_status AS label_lifecycle_status,
                    l.version AS label_version
             FROM dr_drive_node_label nl
             INNER JOIN dr_drive_label l
                ON l.tenant_id=nl.tenant_id
               AND l.id=nl.label_id
               AND l.lifecycle_status='active'
             WHERE nl.tenant_id=$1
               AND nl.node_id=$2
               AND nl.lifecycle_status='active'
               AND l.label_key=$3
             ORDER BY l.label_key ASC
             LIMIT $4 OFFSET $5",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(label_key)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT nl.id, nl.tenant_id, nl.node_id, nl.label_id,
                    nl.lifecycle_status, nl.version,
                    l.label_key, l.display_name, l.color, l.description,
                    l.lifecycle_status AS label_lifecycle_status,
                    l.version AS label_version
             FROM dr_drive_node_label nl
             INNER JOIN dr_drive_label l
                ON l.tenant_id=nl.tenant_id
               AND l.id=nl.label_id
               AND l.lifecycle_status='active'
             WHERE nl.tenant_id=$1
               AND nl.node_id=$2
               AND nl.lifecycle_status='active'
             ORDER BY l.label_key ASC
             LIMIT $3 OFFSET $4",
        )
        .bind(&tenant_id)
        .bind(&node_id)
        .bind(page.limit + 1)
        .bind(page.offset)
        .fetch_all(&state.pool)
        .await
    }
    .map_err(internal_sql_error("list dr_drive_node_label failed"))?;
    let mut items = rows.iter().map(map_node_label_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(NodeLabelListResponse {
        items,
        next_page_token,
    }))
}
pub(crate) async fn apply_node_label(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, label_id)): Path<(String, String)>,
    Json(payload): Json<ApplyNodeLabelRequest>,
) -> Result<Json<NodeLabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "writer").await?;
    find_label(&state.pool, &tenant_id, &label_id).await?;
    let node_label_id = build_node_label_id(&tenant_id, &node_id, &label_id);

    sqlx::query(
        "INSERT INTO dr_drive_node_label (
            id, tenant_id, node_id, label_id, lifecycle_status,
            version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, 'active', 1, $5, $5)
         ON CONFLICT(tenant_id, node_id, label_id) DO UPDATE SET
            lifecycle_status='active',
            updated_by=excluded.updated_by,
            updated_at=CURRENT_TIMESTAMP,
            version=dr_drive_node_label.version + 1",
    )
    .bind(&node_label_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&label_id)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("upsert dr_drive_node_label failed"))?;
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        drive_events::node_label::APPLIED,
        &operator_id,
    )
    .await?;
    Ok(Json(
        find_node_label(&state.pool, &tenant_id, &node_id, &label_id).await?,
    ))
}
pub(crate) async fn remove_node_label(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, label_id)): Path<(String, String)>,
    Query(query): Query<RemoveNodeLabelQuery>,
) -> Result<Json<RemoveNodeLabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "writer").await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_label
         SET lifecycle_status='deleted',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2
           AND node_id=$3
           AND label_id=$4
           AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&label_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_label failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            drive_events::node_label::REMOVED,
            &operator_id,
        )
        .await?;
    }
    Ok(Json(RemoveNodeLabelResponse {
        removed: affected > 0,
    }))
}
fn build_node_property_id(
    tenant_id: &str,
    node_id: &str,
    property_key: &str,
    visibility: &str,
) -> String {
    let digest = sha256_raw_hex_separated(&[
        tenant_id.trim().as_bytes(),
        node_id.trim().as_bytes(),
        visibility.trim().as_bytes(),
        property_key.trim().as_bytes(),
    ]);
    format!("p:{}", &digest[..62])
}
fn build_node_label_id(tenant_id: &str, node_id: &str, label_id: &str) -> String {
    let digest = sha256_raw_hex_separated(&[
        tenant_id.trim().as_bytes(),
        node_id.trim().as_bytes(),
        label_id.trim().as_bytes(),
    ]);
    format!("l:{}", &digest[..62])
}
