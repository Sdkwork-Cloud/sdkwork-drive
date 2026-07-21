//! Durable Drive change log and domain outbox recording per EVENT_SPEC.

use crate::infrastructure::outbox_dispatch::trigger_immediate_outbox_dispatch;
use crate::infrastructure::sql::{begin_transaction_sql, next_drive_runtime_id};
use crate::DriveServiceError;
use chrono::SecondsFormat;
use sdkwork_drive_contract::drive::domain_events as drive_events;
use sdkwork_drive_contract::drive::events::{
    DriveEventEnvelope, DriveNodeVersionCommittedV1Data, DriveRootScopeEffect, DriveRootScopeKind,
};
use serde_json::json;
use sqlx::{AnyConnection, AnyPool, Row};

#[derive(Debug, Clone, Copy)]
pub struct RecordDriveChangeCommand<'a> {
    pub tenant_id: &'a str,
    pub space_id: &'a str,
    pub node_id: Option<&'a str>,
    pub event_type: &'a str,
    pub actor_id: &'a str,
}

#[derive(Debug, Clone, Copy)]
pub struct RecordDriveNodeVersionCommittedCommand<'a> {
    pub tenant_id: &'a str,
    pub organization_id: Option<&'a str>,
    pub space_id: &'a str,
    pub node_id: &'a str,
    pub node_version_id: &'a str,
    pub version_no: i64,
    pub operation_id: &'a str,
    pub content_type: &'a str,
    pub content_length: i64,
    pub checksum_sha256_hex: &'a str,
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

pub async fn record_drive_node_version_committed_on_connection(
    connection: &mut AnyConnection,
    command: RecordDriveNodeVersionCommittedCommand<'_>,
) -> Result<(), DriveServiceError> {
    let sequence_no =
        allocate_change_sequence(connection, command.tenant_id, command.space_id).await?;
    let outbox_id = next_drive_runtime_id("domain outbox")?;
    let drive_uri = format!(
        "drive://spaces/{}/nodes/{}",
        command.space_id, command.node_id
    );
    let space_relative_path = resolve_space_relative_path(
        connection,
        command.tenant_id,
        command.space_id,
        command.node_id,
    )
    .await?;
    let root_scopes = resolve_root_scope_effects(
        connection,
        command.tenant_id,
        command.space_id,
        command.node_id,
    )
    .await?;
    let envelope = DriveEventEnvelope::new(
        outbox_id.to_string(),
        drive_events::node::VERSION_COMMITTED_V1,
        chrono::Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        command.tenant_id,
        command.organization_id.map(str::to_string),
        drive_uri.clone(),
        command.actor_id,
        sequence_no,
        DriveNodeVersionCommittedV1Data {
            operation_id: command.operation_id.to_string(),
            space_id: command.space_id.to_string(),
            node_id: command.node_id.to_string(),
            drive_uri,
            drive_version_id: command.node_version_id.to_string(),
            version_no: command.version_no.to_string(),
            space_relative_path,
            content_type: command.content_type.to_string(),
            content_length: command.content_length.to_string(),
            checksum_sha256_hex: command.checksum_sha256_hex.to_string(),
            root_scopes,
        },
    );
    let payload_json = serde_json::to_string(&envelope).map_err(|error| {
        DriveServiceError::Internal(format!("serialize Drive event envelope failed: {error}"))
    })?;
    insert_change_log_and_outbox_with_payload(
        connection,
        RecordDriveChangeCommand {
            tenant_id: command.tenant_id,
            space_id: command.space_id,
            node_id: Some(command.node_id),
            event_type: drive_events::node::VERSION_COMMITTED_V1,
            actor_id: command.actor_id,
        },
        sequence_no,
        outbox_id,
        &payload_json,
    )
    .await
}

const MAX_ROOT_SCOPE_EFFECTS_PER_EVENT: i64 = 256;

async fn resolve_root_scope_effects(
    connection: &mut AnyConnection,
    tenant_id: &str,
    space_id: &str,
    node_id: &str,
) -> Result<Vec<DriveRootScopeEffect>, DriveServiceError> {
    let rows = sqlx::query(
        "WITH RECURSIVE ancestry(id, parent_node_id, node_name, relative_path, depth) AS (
            SELECT id, parent_node_id, node_name, node_name, 0
            FROM dr_drive_node
            WHERE tenant_id=$1 AND space_id=$2 AND id=$3 AND lifecycle_status='active'
            UNION ALL
            SELECT parent.id,
                   parent.parent_node_id,
                   parent.node_name,
                   CASE
                     WHEN ancestry.depth = 0 THEN ancestry.relative_path
                     ELSE ancestry.node_name || '/' || ancestry.relative_path
                   END,
                   ancestry.depth + 1
            FROM dr_drive_node parent
            INNER JOIN ancestry ON ancestry.parent_node_id=parent.id
            WHERE parent.tenant_id=$1
              AND parent.space_id=$2
              AND parent.lifecycle_status='active'
         )
         SELECT root.uuid AS scope_id,
                'website_root' AS scope_kind,
                ancestry.relative_path,
                CAST(root.active_generation AS TEXT) AS root_generation
         FROM ancestry
         INNER JOIN dr_drive_website_root root
            ON root.tenant_id=$1
           AND root.space_id=$2
           AND root.active_node_id=ancestry.id
           AND root.root_status='active'
         UNION ALL
         SELECT subscription.uuid AS scope_id,
                subscription.consumer_kind AS scope_kind,
                ancestry.relative_path,
                NULL AS root_generation
         FROM ancestry
         INNER JOIN dr_drive_root_scope_subscription subscription
            ON subscription.tenant_id=$1
           AND subscription.space_id=$2
           AND subscription.root_node_id=ancestry.id
           AND subscription.scope_status='active'
         ORDER BY scope_kind, scope_id
         LIMIT $4",
    )
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_id)
    .bind(MAX_ROOT_SCOPE_EFFECTS_PER_EVENT)
    .fetch_all(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!("resolve Drive root scope effects failed: {error}"))
    })?;

    rows.iter()
        .map(|row| {
            let scope_kind: String = row.get("scope_kind");
            let scope_kind = match scope_kind.as_str() {
                "website_root" => DriveRootScopeKind::WebsiteRoot,
                "knowledgebase_raw" => DriveRootScopeKind::KnowledgebaseRaw,
                _ => {
                    return Err(DriveServiceError::Internal(format!(
                        "unsupported Drive root scope kind: {scope_kind}"
                    )))
                }
            };
            Ok(DriveRootScopeEffect {
                scope_id: row.get("scope_id"),
                scope_kind,
                relative_path: row.get("relative_path"),
                root_generation: row.get("root_generation"),
            })
        })
        .collect()
}

pub async fn record_drive_change(
    pool: &AnyPool,
    command: RecordDriveChangeCommand<'_>,
) -> Result<(), DriveServiceError> {
    let mut connection = pool.acquire().await.map_err(sql_internal)?;
    sqlx::query(begin_transaction_sql())
        .execute(&mut *connection)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!("begin change record transaction failed: {error}"))
        })?;

    match record_drive_change_on_connection(&mut connection, command).await {
        Ok(()) => {
            sqlx::query("COMMIT")
                .execute(&mut *connection)
                .await
                .map_err(|error| {
                    DriveServiceError::Internal(format!(
                        "commit change record transaction failed: {error}"
                    ))
                })?;
            sdkwork_drive_observability::metrics::record_outbox_pending();
            trigger_immediate_outbox_dispatch(pool.clone());
            Ok(())
        }
        Err(error) => {
            let _ = sqlx::query("ROLLBACK").execute(&mut *connection).await;
            Err(error)
        }
    }
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
        DriveServiceError::Internal(format!(
            "allocate dr_drive_change_log sequence failed: {error}"
        ))
    })
}

async fn insert_change_log_and_outbox(
    connection: &mut AnyConnection,
    command: RecordDriveChangeCommand<'_>,
    sequence_no: i64,
) -> Result<(), DriveServiceError> {
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
    insert_change_log_and_outbox_with_payload(
        connection,
        command,
        sequence_no,
        outbox_id,
        &payload_json,
    )
    .await
}

async fn insert_change_log_and_outbox_with_payload(
    connection: &mut AnyConnection,
    command: RecordDriveChangeCommand<'_>,
    sequence_no: i64,
    outbox_id: i64,
    payload_json: &str,
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

async fn resolve_space_relative_path(
    connection: &mut AnyConnection,
    tenant_id: &str,
    space_id: &str,
    node_id: &str,
) -> Result<String, DriveServiceError> {
    let rows = sqlx::query(
        "WITH RECURSIVE lineage(id, parent_node_id, node_name, depth) AS (
            SELECT id, parent_node_id, node_name, 0
            FROM dr_drive_node
            WHERE tenant_id=$1 AND space_id=$2 AND id=$3 AND lifecycle_status != 'deleted'
            UNION ALL
            SELECT parent.id, parent.parent_node_id, parent.node_name, lineage.depth + 1
            FROM dr_drive_node parent
            INNER JOIN lineage ON lineage.parent_node_id=parent.id
            WHERE parent.tenant_id=$1
              AND parent.space_id=$2
              AND parent.lifecycle_status != 'deleted'
         )
         SELECT node_name
         FROM lineage
         ORDER BY depth DESC",
    )
    .bind(tenant_id)
    .bind(space_id)
    .bind(node_id)
    .fetch_all(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!("resolve Drive node relative path failed: {error}"))
    })?;
    if rows.is_empty() {
        return Err(DriveServiceError::NotFound(
            "Drive node path cannot be resolved".to_string(),
        ));
    }
    Ok(rows
        .iter()
        .map(|row| row.get::<String, _>("node_name"))
        .collect::<Vec<_>>()
        .join("/"))
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
