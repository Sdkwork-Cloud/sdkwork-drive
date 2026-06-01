use crate::domain::upload::{DriveUploadSession, DriveUploadSessionState};
use crate::ports::upload_session_store::{DriveUploadSessionStore, NewDriveUploadSession};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct CreateUploadSessionCommand {
    pub session_id: String,
    pub tenant_id: String,
    pub space_id: String,
    pub node_id: String,
    pub bucket: String,
    pub object_key: String,
    pub idempotency_key: String,
    pub operator_id: String,
    pub expires_at_epoch_ms: i64,
}

#[derive(Debug, Clone)]
pub struct DriveUploadService<S>
where
    S: DriveUploadSessionStore,
{
    store: S,
}

impl<S> DriveUploadService<S>
where
    S: DriveUploadSessionStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn create_upload_session(
        &self,
        command: CreateUploadSessionCommand,
    ) -> Result<DriveUploadSession, DriveProductError> {
        if command.session_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "session_id is required".to_string(),
            ));
        }
        if command.idempotency_key.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "idempotency_key is required".to_string(),
            ));
        }
        if command.bucket.trim().is_empty() || command.object_key.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "bucket and object_key are required".to_string(),
            ));
        }

        if let Some(existing) = self
            .store
            .find_by_idempotency(
                &command.tenant_id,
                &command.space_id,
                &command.node_id,
                &command.idempotency_key,
            )
            .await?
        {
            return Ok(existing);
        }

        let new_session = NewDriveUploadSession {
            id: command.session_id,
            tenant_id: command.tenant_id,
            space_id: command.space_id,
            node_id: command.node_id,
            bucket: command.bucket,
            object_key: command.object_key,
            idempotency_key: command.idempotency_key,
            state: DriveUploadSessionState::Created.as_str().to_string(),
            expires_at_epoch_ms: command.expires_at_epoch_ms,
            created_by: command.operator_id.clone(),
            updated_by: command.operator_id,
        };
        self.store.insert_upload_session(&new_session).await
    }
}
