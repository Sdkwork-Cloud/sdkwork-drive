//! Durable Drive change log and domain outbox recording per EVENT_SPEC.

use crate::infrastructure::outbox_dispatch::trigger_immediate_outbox_dispatch;
use crate::infrastructure::sql::next_drive_runtime_id;
use crate::DriveServiceError;
use serde_json::json;
use sqlx::{AnyConnection, AnyPool};

#[derive(Debug, Clone, Copy)]
pub struct RecordDriveChangeCommand<'a> {
    pub tenant_id: &'a str,
    pub space_id: &'a str,
    pub node_id: Option<&'a str>,
    pub event_type: &'a str,
    pub actor_id: &'a str,
}

pub async fn record_drive_change_on_connection(
    connection: &mut AnyConnection,
    command: RecordDriveChangeCommand<'_>,
) -> Result<(), DriveServiceError> {
    let sequence_no =
        allocate_change_sequence(connection, command.tenant_id, command.space_id).await?;
    insert_change_log_and_outbox(connection, command, sequence_no).await?;
    Ok(())
}

pub async fn record_drive_change(
    pool: &AnyPool,
    command: RecordDriveChangeCommand<'_>,
) -> Result<(), DriveServiceError> {
    let mut connection = pool.acquire().await.map_err(sql_internal)?;
    record_drive_change_on_connection(&mut connection, command).await?;
    sdkwork_drive_observability::metrics::record_outbox_pending();
    trigger_immediate_outbox_dispatch(pool.clone());
    Ok(())
}

async fn allocate_change_sequence(
    connection: &mut AnyConnection,
    tenant_id: &str,
    space_id: &str,
) -> Result<i64, DriveServiceError> {
    let cursor_id = format!("cursor:{tenant_id}:{space_id}");
    sqlx::query_scalar(
        "INSERT INTO dr_drive_change_cursor (
            id, tenant_id, space_id, last_sequence_no
         ) VALUES ($1, $2, $3, 1)
         ON CONFLICT(tenant_id, space_id) DO UPDATE SET
            last_sequence_no=dr_drive_change_cursor.last_sequence_no + 1,
            updated_at=CURRENT_TIMESTAMP
         RETURNING last_sequence_no",
    )
    .bind(&cursor_id)
    .bind(tenant_id)
    .bind(space_id)
    .fetch_one(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!("allocate dr_drive_change_log sequence failed: {error}"))
    })
}

async fn insert_change_log_and_outbox(
    connection: &mut AnyConnection,
    command: RecordDriveChangeCommand<'_>,
    sequence_no: i64,
) -> Result<(), DriveServiceError> {
    let change_log_id = next_drive_runtime_id("drive change log")?;
    sqlx::query(
        "INSERT INTO dr_drive_change_log (
            id, tenant_id, space_id, node_id, sequence_no, event_type, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(change_log_id)
    .bind(command.tenant_id)
    .bind(command.space_id)
    .bind(command.node_id)
    .bind(sequence_no)
    .bind(command.event_type)
    .bind(command.actor_id)
    .execute(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!("insert dr_drive_change_log failed: {error}"))
    })?;

    let outbox_id = next_drive_runtime_id("domain outbox")?;
    let payload_json = json!({
        "tenantId": command.tenant_id,
        "spaceId": command.space_id,
        "nodeId": command.node_id,
        "eventType": command.event_type,
        "sequenceNo": sequence_no,
        "actorId": command.actor_id,
        "resourceType": "changes",
    })
    .to_string();
    sqlx::query(
        "INSERT INTO dr_drive_domain_outbox (
            id, tenant_id, space_id, node_id, event_type, actor_id,
            sequence_no, payload_json, delivery_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')",
    )
    .bind(outbox_id)
    .bind(command.tenant_id)
    .bind(command.space_id)
    .bind(command.node_id)
    .bind(command.event_type)
    .bind(command.actor_id)
    .bind(sequence_no)
    .bind(payload_json)
    .execute(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!("insert dr_drive_domain_outbox failed: {error}"))
    })?;
    Ok(())
}

fn sql_internal(error: sqlx::Error) -> DriveServiceError {
    DriveServiceError::Internal(format!("acquire database connection failed: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_drive_change_command_carries_event_type() {
        let command = RecordDriveChangeCommand {
            tenant_id: "tenant-a",
            space_id: "space-a",
            node_id: Some("node-a"),
            event_type: "drive.node.created",
            actor_id: "user-a",
        };
        assert_eq!(command.event_type, "drive.node.created");
    }
}
