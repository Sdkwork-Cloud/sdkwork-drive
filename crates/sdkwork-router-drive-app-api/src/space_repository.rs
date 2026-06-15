use crate::error::{internal_sql_error, not_found_problem, ProblemDetail};
use axum::http::StatusCode;
use axum::Json;
use sqlx::AnyPool;

pub(crate) async fn validate_space_exists(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_space
         WHERE tenant_id=$1 AND id=$2 AND lifecycle_status='active'",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error("validate dr_drive_space failed"))?;
    if count == 0 {
        return Err(not_found_problem("space not found"));
    }
    Ok(())
}

pub(crate) async fn validate_space_exists_for_change_history(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1)
         FROM dr_drive_space
         WHERE tenant_id=$1 AND id=$2",
    )
    .bind(tenant_id)
    .bind(space_id)
    .fetch_one(pool)
    .await
    .map_err(internal_sql_error(
        "validate dr_drive_space change history failed",
    ))?;
    if count == 0 {
        return Err(not_found_problem("space not found"));
    }
    Ok(())
}
