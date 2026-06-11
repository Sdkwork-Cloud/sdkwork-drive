use crate::audit::record_label_audit;
use crate::dto::{
    CreateLabelRequest, DeleteLabelResponse, LabelListQuery, LabelListResponse, LabelMutationQuery,
    LabelResponse, UpdateLabelRequest,
};
use crate::error::{
    internal_problem, internal_sql_error, map_product_error, not_found_problem, problem,
    ProblemDetail,
};
use crate::mappers::map_label_row;
use crate::state::BackendState;
use crate::validators::{
    next_page_token, normalize_optional_text, parse_offset_page, require_non_empty_text,
    require_tenant_id, validate_label_color, validate_label_key, validate_lifecycle_status,
};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;

pub(crate) async fn list_labels(
    State(state): State<BackendState>,
    Query(query): Query<LabelListQuery>,
) -> Result<Json<LabelListResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    let page = parse_offset_page(query.page_size, query.page_token)?;
    let lifecycle_status =
        normalize_optional_text(query.lifecycle_status).unwrap_or_else(|| "active".to_string());
    validate_lifecycle_status(&lifecycle_status)?;

    let rows = sqlx::query(
        "SELECT id, tenant_id, label_key, display_name, color, description,
                lifecycle_status, version
         FROM dr_drive_label
         WHERE tenant_id=$1 AND lifecycle_status=$2
         ORDER BY label_key ASC
         LIMIT $3 OFFSET $4",
    )
    .bind(&tenant_id)
    .bind(&lifecycle_status)
    .bind(page.limit + 1)
    .bind(page.offset)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_sql_error("list dr_drive_label failed"))?;
    let mut items = rows.iter().map(map_label_row).collect::<Vec<_>>();
    let next_page_token = next_page_token(&mut items, page);
    Ok(Json(LabelListResponse {
        items,
        next_page_token,
    }))
}

pub(crate) async fn get_label(
    State(state): State<BackendState>,
    Path(label_id): Path<String>,
    Query(query): Query<LabelMutationQuery>,
) -> Result<Json<LabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    Ok(Json(find_label(&state, &tenant_id, &label_id).await?))
}

pub(crate) async fn create_label(
    State(state): State<BackendState>,
    Json(payload): Json<CreateLabelRequest>,
) -> Result<(StatusCode, Json<LabelResponse>), (StatusCode, Json<ProblemDetail>)> {
    let id = require_non_empty_text(payload.id, "id")?;
    let tenant_id = require_non_empty_text(payload.tenant_id, "tenantId")?;
    let label_key = validate_label_key(&payload.label_key)?.to_string();
    let display_name = require_non_empty_text(payload.display_name, "displayName")?;
    let color = match normalize_optional_text(payload.color) {
        Some(color) => Some(validate_label_color(&color)?.to_string()),
        None => None,
    };
    let description = normalize_optional_text(payload.description);
    let operator_id = require_non_empty_text(payload.operator_id, "operatorId")?;

    sqlx::query(
        "INSERT INTO dr_drive_label (
            id, tenant_id, label_key, display_name, color, description,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 1, $7, $7)",
    )
    .bind(&id)
    .bind(&tenant_id)
    .bind(&label_key)
    .bind(&display_name)
    .bind(color.as_deref())
    .bind(description.as_deref())
    .bind(&operator_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        let message = error.to_string();
        if message.contains("UNIQUE constraint failed")
            || message.contains("duplicate key value violates unique constraint")
        {
            return problem(
                StatusCode::CONFLICT,
                "conflict",
                "label key already exists",
                "drive.conflict",
            );
        }
        internal_problem(format!("insert dr_drive_label failed: {message}"))
    })?;
    record_label_audit(&state, "label.created", &id, &operator_id).await?;
    Ok((
        StatusCode::CREATED,
        Json(find_label(&state, &tenant_id, &id).await?),
    ))
}

pub(crate) async fn update_label(
    State(state): State<BackendState>,
    Path(label_id): Path<String>,
    Json(payload): Json<UpdateLabelRequest>,
) -> Result<Json<LabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(payload.tenant_id).map_err(map_product_error)?;
    let current = find_label(&state, &tenant_id, &label_id).await?;
    let display_name = payload
        .display_name
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or(current.display_name);
    let color = match normalize_optional_text(payload.color) {
        Some(color) => Some(validate_label_color(&color)?.to_string()),
        None => current.color,
    };
    let description = payload.description.or(current.description);
    let operator_id = require_non_empty_text(payload.operator_id, "operatorId")?;

    let affected = sqlx::query(
        "UPDATE dr_drive_label
         SET display_name=$1,
             color=$2,
             description=$3,
             updated_by=$4,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$5 AND id=$6 AND lifecycle_status='active'",
    )
    .bind(&display_name)
    .bind(color.as_deref())
    .bind(description.as_deref())
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&label_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("update dr_drive_label failed"))?
    .rows_affected();
    if affected == 0 {
        return Err(not_found_problem("label not found"));
    }
    record_label_audit(&state, "label.updated", &label_id, &operator_id).await?;
    Ok(Json(find_label(&state, &tenant_id, &label_id).await?))
}

pub(crate) async fn delete_label(
    State(state): State<BackendState>,
    Path(label_id): Path<String>,
    Query(query): Query<LabelMutationQuery>,
) -> Result<Json<DeleteLabelResponse>, (StatusCode, Json<ProblemDetail>)> {
    let tenant_id = require_tenant_id(query.tenant_id).map_err(map_product_error)?;
    let operator_id = require_non_empty_text(
        query
            .operator_id
            .unwrap_or_else(|| "operator-unset".to_string()),
        "operatorId",
    )?;
    let affected = sqlx::query(
        "UPDATE dr_drive_label
         SET lifecycle_status='deleted',
             updated_by=$1,
             updated_at=CURRENT_TIMESTAMP,
             version=version + 1
         WHERE tenant_id=$2 AND id=$3 AND lifecycle_status != 'deleted'",
    )
    .bind(&operator_id)
    .bind(&tenant_id)
    .bind(&label_id)
    .execute(&state.pool)
    .await
    .map_err(internal_sql_error("delete dr_drive_label failed"))?
    .rows_affected();
    if affected > 0 {
        sqlx::query(
            "UPDATE dr_drive_node_label
             SET lifecycle_status='deleted',
                 updated_by=$1,
                 updated_at=CURRENT_TIMESTAMP,
                 version=version + 1
             WHERE tenant_id=$2 AND label_id=$3 AND lifecycle_status != 'deleted'",
        )
        .bind(&operator_id)
        .bind(&tenant_id)
        .bind(&label_id)
        .execute(&state.pool)
        .await
        .map_err(internal_sql_error(
            "delete dr_drive_node_label for label failed",
        ))?;
        record_label_audit(&state, "label.deleted", &label_id, &operator_id).await?;
    }
    Ok(Json(DeleteLabelResponse {
        deleted: affected > 0,
    }))
}

pub(crate) async fn find_label(
    state: &BackendState,
    tenant_id: &str,
    label_id: &str,
) -> Result<LabelResponse, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, label_key, display_name, color, description,
                lifecycle_status, version
         FROM dr_drive_label
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(label_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal_sql_error("find dr_drive_label failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("label not found"));
    };
    Ok(map_label_row(&row))
}
