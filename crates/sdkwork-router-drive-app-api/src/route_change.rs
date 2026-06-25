use crate::error::{map_service_error, ProblemDetail};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::infrastructure::change_recorder::{
    self, RecordDriveChangeCommand,
};
use sqlx::{AnyConnection, AnyPool};

pub(crate) async fn record_change(
    pool: &AnyPool,
    tenant_id: &str,
    space_id: &str,
    node_id: Option<&str>,
    event_type: &str,
    actor_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    change_recorder::record_drive_change(
        pool,
        RecordDriveChangeCommand {
            tenant_id,
            space_id,
            node_id,
            event_type,
            actor_id,
        },
    )
    .await
    .map_err(map_service_error)
}

pub(crate) async fn record_change_on_connection(
    connection: &mut AnyConnection,
    tenant_id: &str,
    space_id: &str,
    node_id: Option<&str>,
    event_type: &str,
    actor_id: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    change_recorder::record_drive_change_on_connection(
        connection,
        RecordDriveChangeCommand {
            tenant_id,
            space_id,
            node_id,
            event_type,
            actor_id,
        },
    )
    .await
    .map_err(map_service_error)
}
