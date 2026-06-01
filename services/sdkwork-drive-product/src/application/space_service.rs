use crate::domain::space::{DriveSpace, DriveSpaceType};
use crate::ports::space_store::{DriveSpaceStore, NewDriveSpace};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct CreateSpaceCommand {
    pub id: String,
    pub tenant_id: String,
    pub owner_subject_type: String,
    pub owner_subject_id: String,
    pub display_name: String,
    pub space_type: DriveSpaceType,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct DriveSpaceService<S>
where
    S: DriveSpaceStore,
{
    store: S,
}

impl<S> DriveSpaceService<S>
where
    S: DriveSpaceStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn create_space(
        &self,
        command: CreateSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        if command.id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "space id is required".to_string(),
            ));
        }
        if command.tenant_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "tenant_id is required".to_string(),
            ));
        }
        if command.display_name.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "display_name is required".to_string(),
            ));
        }

        let new_space = NewDriveSpace {
            id: command.id,
            tenant_id: command.tenant_id,
            owner_subject_type: command.owner_subject_type,
            owner_subject_id: command.owner_subject_id,
            display_name: command.display_name,
            space_type: command.space_type.as_str().to_string(),
            lifecycle_status: "active".to_string(),
            created_by: command.operator_id.clone(),
            updated_by: command.operator_id,
        };
        self.store.insert_space(&new_space).await
    }

    pub async fn list_spaces(
        &self,
        command: ListSpacesCommand,
    ) -> Result<Vec<DriveSpace>, DriveProductError> {
        if command.tenant_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "tenant_id is required".to_string(),
            ));
        }
        let owner_type = command.owner_subject_type.as_deref();
        let owner_id = command.owner_subject_id.as_deref();
        if (owner_type.is_some() && owner_id.is_none())
            || (owner_type.is_none() && owner_id.is_some())
        {
            return Err(DriveProductError::Validation(
                "owner_subject_type and owner_subject_id must be provided together".to_string(),
            ));
        }

        self.store
            .list_spaces(command.tenant_id.trim(), owner_type, owner_id)
            .await
    }
}

#[derive(Debug, Clone)]
pub struct ListSpacesCommand {
    pub tenant_id: String,
    pub owner_subject_type: Option<String>,
    pub owner_subject_id: Option<String>,
}
