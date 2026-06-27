use crate::acl;
use crate::app_context::DriveRequestContext;
use crate::dto::{
    CreatePermissionRequest, EffectivePermissionListResponse, EffectivePermissionResponse,
    NodeMutationQuery, PageQuery, PermissionListResponse, PermissionResponse,
    UpdatePermissionRequest,
};
use crate::error::{
    internal_problem, internal_sql_error, is_unique_constraint_error, not_found_problem, problem,
    ProblemDetail,
};
use crate::mappers::map_permission_row;
use crate::node_repository::{find_active_node, find_node, resolve_node_path};
use crate::route_change::record_change;
use crate::state::AppState;
use crate::validators::{
    next_page_token, parse_page_request, validate_permission_role, validate_subject_type,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use sdkwork_drive_contract::drive::domain_events as drive_events;
use serde_json::json;
use std::collections::BTreeSet;

pub(crate) async fn list_permissions(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<PermissionListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    let rows = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
         ORDER BY subject_type ASC, subject_id ASC
         LIMIT $3 OFFSET $4",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_node_permission failed"))?;
    let mut items = rows.iter().map(map_permission_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);

    Ok(Json(PermissionListResponse {
        items,
        next_page_token,
    }))
}

pub(crate) async fn get_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("permission not found"));
    };
    Ok(Json(map_permission_row(&row)))
}

pub(crate) async fn list_effective_permissions(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Json<EffectivePermissionListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let page = parse_page_request(query.page_size, query.page_token)?;
    let node = find_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    let node_path = resolve_node_path(&state.pool, &tenant_id, &node_id).await?;
    let mut items = Vec::<EffectivePermissionResponse>::new();
    let mut seen_principals = BTreeSet::<(String, String)>::new();

    for node in node_path.iter().rev() {
        let rows = sqlx::query(
            "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
             FROM dr_drive_node_permission
             WHERE tenant_id=$1 AND node_id=$2 AND lifecycle_status='active'
             ORDER BY subject_type ASC, subject_id ASC, id ASC",
        )
        .bind(&tenant_id)
        .bind(&node.id)
        .fetch_all(&state.pool)
        .await
        .map_err(internal_sql_error("list effective dr_drive_node_permission failed"))?;

        for row in rows {
            let permission = map_permission_row(&row);
            let principal_key = (
                permission.subject_type.clone(),
                permission.subject_id.clone(),
            );
            if !seen_principals.insert(principal_key) {
                continue;
            }
            let inherited = permission.node_id != node_id;
            items.push(EffectivePermissionResponse {
                id: permission.id,
                tenant_id: permission.tenant_id,
                target_node_id: node_id.clone(),
                node_id: permission.node_id.clone(),
                subject_type: permission.subject_type,
                subject_id: permission.subject_id,
                role: permission.role,
                inherited,
                inherited_from_node_id: inherited.then_some(permission.node_id),
                lifecycle_status: permission.lifecycle_status,
                version: permission.version,
            });
        }
    }

    let mut page_items = items
        .into_iter()
        .skip(page.offset as usize)
        .take((page.limit + 1) as usize)
        .collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut page_items, page);

    Ok(Json(EffectivePermissionListResponse {
        items: page_items,
        next_page_token,
    }))
}

pub(crate) async fn create_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path(node_id): Path<String>,
    Json(payload): Json<CreatePermissionRequest>,
) -> Result<(StatusCode, Json<PermissionResponse>), (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;

    validate_subject_type(&payload.subject_type)?;
    validate_permission_role(&payload.role)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    sqlx::query(
        "INSERT INTO dr_drive_node_permission (
            id, tenant_id, node_id, subject_type, subject_id, role,
            inherited, lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', 1, $7, $7)",
    )
    .bind(&payload.id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&payload.subject_type)
    .bind(&payload.subject_id)
    .bind(&payload.role)
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        if is_unique_constraint_error(&error) {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "permission already exists for node subject",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert dr_drive_node_permission failed: {error}"))
    })?;

    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        drive_events::permission::CREATED,
        &operator_id,
    )
    .await?;

    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(&tenant_id)
    .bind(&payload.id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;

    Ok((StatusCode::CREATED, Json(map_permission_row(&row))))
}

pub(crate) async fn update_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
    Json(payload): Json<UpdatePermissionRequest>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(payload.operator_id.clone())?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    let current_row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3 AND lifecycle_status='active'",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_permission failed"))?;
    let Some(current_row) = current_row else {
        return Err(not_found_problem("permission not found"));
    };
    let current = map_permission_row(&current_row);
    let role = payload
        .role
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or(current.role);
    validate_permission_role(&role)?;

    let affected = sqlx::query(
        "UPDATE dr_drive_node_permission
         SET role=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$3 AND node_id=$4 AND id=$5 AND lifecycle_status='active'",
    )
    .bind(&role)
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_node_permission failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("permission not found"));
    }
    record_change(
        &state.pool,
        &tenant_id,
        &node.space_id,
        Some(&node_id),
        drive_events::permission::UPDATED,
        &operator_id,
    )
    .await?;

    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, subject_type, subject_id, role, inherited, lifecycle_status, version
         FROM dr_drive_node_permission
         WHERE tenant_id=$1 AND node_id=$2 AND id=$3",
    )
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_sql_error("read dr_drive_node_permission failed"))?;

    Ok(Json(map_permission_row(&row)))
}

pub(crate) async fn delete_permission(
    State(state): State<AppState>,
    Extension(ctx): Extension<DriveRequestContext>,
    Path((node_id, permission_id)): Path<(String, String)>,
    Query(query): Query<NodeMutationQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = ctx.resolve_tenant_id()?;
    let operator_id = ctx.resolve_operator_id(query.operator_id)?;
    let node = find_active_node(&state.pool, &tenant_id, &node_id).await?;
    acl::ensure_ctx_node_role(&state.pool, &ctx, &node.space_id, &node_id, "owner").await?;
    let affected = sqlx::query(
        "UPDATE dr_drive_node_permission
         SET lifecycle_status='deleted', updated_by=$1, updated_at=CURRENT_TIMESTAMP, version=version + 1
         WHERE tenant_id=$2 AND node_id=$3 AND id=$4 AND lifecycle_status='active'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&node_id)
    .bind(&permission_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_node_permission failed"))?
    .rows_affected();
    if affected > 0 {
        record_change(
            &state.pool,
            &tenant_id,
            &node.space_id,
            Some(&node_id),
            drive_events::permission::DELETED,
            &operator_id,
        )
        .await?;
    }
    Ok(Json(json!({ "deleted": affected > 0 })))
}
