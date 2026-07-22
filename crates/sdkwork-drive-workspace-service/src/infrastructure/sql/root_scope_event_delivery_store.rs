use async_trait::async_trait;
use sqlx::any::AnyRow;
use sqlx::{AnyConnection, AnyPool, Row};

use crate::domain::root_scope_event_delivery::DriveRootScopeEventDelivery;
use crate::infrastructure::sql::begin_transaction_sql;
use crate::ports::root_scope_event_delivery_store::{
    DriveRootScopeEventDeliveryStore, EnsureDriveRootScopeEventDelivery,
    EnsureDriveRootScopeEventDeliveryResult,
};
use crate::DriveServiceError;

const DELIVERY_SELECT_COLUMNS: &str = "id, address, expiration_epoch_ms, lifecycle_status, version, CAST(created_at AS TEXT) AS created_at, CAST(updated_at AS TEXT) AS updated_at";

#[derive(Debug, Clone)]
pub struct SqlRootScopeEventDeliveryStore {
    pool: AnyPool,
}

impl SqlRootScopeEventDeliveryStore {
    pub fn new(pool: AnyPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DriveRootScopeEventDeliveryStore for SqlRootScopeEventDeliveryStore {
    async fn ensure_delivery(
        &self,
        command: &EnsureDriveRootScopeEventDelivery,
    ) -> Result<EnsureDriveRootScopeEventDeliveryResult, DriveServiceError> {
        let mut connection = self.pool.acquire().await.map_err(|error| {
            DriveServiceError::Internal(format!(
                "acquire root scope event delivery transaction failed: {error}"
            ))
        })?;
        sqlx::query(begin_transaction_sql())
            .execute(&mut *connection)
            .await
            .map_err(|error| {
                DriveServiceError::Internal(format!(
                    "begin root scope event delivery transaction failed: {error}"
                ))
            })?;
        let result = ensure_on_connection(&mut connection, command).await;
        match result {
            Ok(result) => {
                sqlx::query("COMMIT")
                    .execute(&mut *connection)
                    .await
                    .map_err(|error| {
                        DriveServiceError::Internal(format!(
                            "commit root scope event delivery transaction failed: {error}"
                        ))
                    })?;
                Ok(result)
            }
            Err(error) => {
                let _ = sqlx::query("ROLLBACK").execute(&mut *connection).await;
                Err(error)
            }
        }
    }
}

async fn ensure_on_connection(
    connection: &mut AnyConnection,
    command: &EnsureDriveRootScopeEventDelivery,
) -> Result<EnsureDriveRootScopeEventDeliveryResult, DriveServiceError> {
    let subscription = sqlx::query(
        "SELECT space_id, scope_status
         FROM dr_drive_root_scope_subscription
         WHERE tenant_id=$1 AND uuid=$2 AND consumer_kind='knowledgebase_raw'",
    )
    .bind(&command.tenant_id)
    .bind(&command.subscription_uuid)
    .fetch_optional(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!(
            "find root scope for event delivery failed: {error}"
        ))
    })?
    .ok_or_else(|| DriveServiceError::NotFound("root scope subscription not found".to_string()))?;
    let space_id: String = subscription.get("space_id");
    let scope_status: String = subscription.get("scope_status");
    if scope_status != "active" {
        return Err(DriveServiceError::Conflict(
            "root scope subscription is not active".to_string(),
        ));
    }

    let existing = sqlx::query(&format!(
        "SELECT {DELIVERY_SELECT_COLUMNS}, space_id, node_id, resource_type, resource_id, token_hash
         FROM dr_drive_watch_channel
         WHERE tenant_id=$1 AND id=$2",
    ))
    .bind(&command.tenant_id)
    .bind(&command.channel_id)
    .fetch_optional(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!(
            "find root scope event delivery channel failed: {error}"
        ))
    })?;

    if let Some(existing) = existing {
        validate_existing_channel(&existing, &space_id)?;
        let unchanged = existing.get::<String, _>("address") == command.address
            && existing.get::<Option<String>, _>("token_hash").as_deref()
                == Some(command.signing_key_sha256.as_str())
            && existing.get::<i64, _>("expiration_epoch_ms") == command.expiration_epoch_ms
            && existing.get::<String, _>("lifecycle_status") == "active";
        if unchanged {
            return Ok(EnsureDriveRootScopeEventDeliveryResult {
                delivery: map_delivery(&existing, &command.subscription_uuid),
                created: false,
            });
        }
        sqlx::query(
            "UPDATE dr_drive_watch_channel
             SET address=$1, token_hash=$2, expiration_epoch_ms=$3,
                 lifecycle_status='active', updated_by=$4,
                 updated_at=CURRENT_TIMESTAMP, version=version + 1
             WHERE tenant_id=$5 AND id=$6",
        )
        .bind(&command.address)
        .bind(&command.signing_key_sha256)
        .bind(command.expiration_epoch_ms)
        .bind(&command.operator_id)
        .bind(&command.tenant_id)
        .bind(&command.channel_id)
        .execute(&mut *connection)
        .await
        .map_err(|error| {
            DriveServiceError::Internal(format!(
                "update root scope event delivery channel failed: {error}"
            ))
        })?;
        return read_delivery(connection, command, false).await;
    }

    sqlx::query(
        "INSERT INTO dr_drive_watch_channel (
            id, tenant_id, space_id, node_id, resource_type, resource_id,
            channel_type, address, token_hash, expiration_epoch_ms,
            lifecycle_status, version, created_by, updated_by
         ) VALUES ($1, $2, $3, NULL, 'changes', $3, 'web_hook', $4, $5, $6,
                   'active', 1, $7, $7)",
    )
    .bind(&command.channel_id)
    .bind(&command.tenant_id)
    .bind(&space_id)
    .bind(&command.address)
    .bind(&command.signing_key_sha256)
    .bind(command.expiration_epoch_ms)
    .bind(&command.operator_id)
    .execute(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!(
            "insert root scope event delivery channel failed: {error}"
        ))
    })?;
    read_delivery(connection, command, true).await
}

fn validate_existing_channel(row: &AnyRow, space_id: &str) -> Result<(), DriveServiceError> {
    if row.get::<Option<String>, _>("space_id").as_deref() != Some(space_id)
        || row.get::<Option<String>, _>("node_id").is_some()
        || row.get::<String, _>("resource_type") != "changes"
        || row.get::<Option<String>, _>("resource_id").as_deref() != Some(space_id)
    {
        return Err(DriveServiceError::Conflict(
            "root scope event delivery channel cannot be retargeted".to_string(),
        ));
    }
    Ok(())
}

async fn read_delivery(
    connection: &mut AnyConnection,
    command: &EnsureDriveRootScopeEventDelivery,
    created: bool,
) -> Result<EnsureDriveRootScopeEventDeliveryResult, DriveServiceError> {
    let row = sqlx::query(&format!(
        "SELECT {DELIVERY_SELECT_COLUMNS}
         FROM dr_drive_watch_channel WHERE tenant_id=$1 AND id=$2",
    ))
    .bind(&command.tenant_id)
    .bind(&command.channel_id)
    .fetch_one(&mut *connection)
    .await
    .map_err(|error| {
        DriveServiceError::Internal(format!(
            "read root scope event delivery channel failed: {error}"
        ))
    })?;
    Ok(EnsureDriveRootScopeEventDeliveryResult {
        delivery: map_delivery(&row, &command.subscription_uuid),
        created,
    })
}

fn map_delivery(row: &AnyRow, subscription_uuid: &str) -> DriveRootScopeEventDelivery {
    DriveRootScopeEventDelivery {
        channel_id: row.get("id"),
        subscription_uuid: subscription_uuid.to_string(),
        address: row.get("address"),
        expiration_epoch_ms: row.get("expiration_epoch_ms"),
        lifecycle_status: row.get("lifecycle_status"),
        version: row.get("version"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
