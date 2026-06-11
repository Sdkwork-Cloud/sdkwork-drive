use crate::dto::{LabelSummaryResponse, NodeLabelResponse, NodePropertyResponse};
use crate::error::{internal_sql_error, not_found_problem, ProblemDetail};
use crate::mappers::{map_label_summary_row, map_node_label_row, map_node_property_row};
use axum::http::StatusCode;
use axum::Json;
use sqlx::AnyPool;

pub(crate) async fn find_node_property(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
    property_key: &str,
    visibility: &str,
) -> Result<NodePropertyResponse, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id, tenant_id, node_id, property_key, property_value, visibility,
                lifecycle_status, version
         FROM dr_drive_node_property
         WHERE tenant_id=$1
           AND node_id=$2
           AND property_key=$3
           AND visibility=$4
           AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(node_id)
    .bind(property_key)
    .bind(visibility)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_property failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("property not found"));
    };
    Ok(map_node_property_row(&row))
}

pub(crate) async fn find_label(
    pool: &AnyPool,
    tenant_id: &str,
    label_id: &str,
) -> Result<LabelSummaryResponse, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
        "SELECT id AS label_id, tenant_id, label_key, display_name, color, description,
                lifecycle_status AS label_lifecycle_status,
                version AS label_version
         FROM dr_drive_label
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(label_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_label failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("label not found"));
    };
    Ok(map_label_summary_row(&row))
}

pub(crate) async fn find_node_label(
    pool: &AnyPool,
    tenant_id: &str,
    node_id: &str,
    label_id: &str,
) -> Result<NodeLabelResponse, (StatusCode, Json<ProblemDetail>)> {
    let row = sqlx::query(
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
           AND nl.label_id=$3
           AND nl.lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(node_id)
    .bind(label_id)
    .fetch_optional(pool)
    .await
    .map_err(internal_sql_error("find dr_drive_node_label failed"))?;
    let Some(row) = row else {
        return Err(not_found_problem("node label not found"));
    };
    Ok(map_node_label_row(&row))
}
