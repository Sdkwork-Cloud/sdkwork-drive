use crate::domain::space::{DriveSpace, DriveSpaceType};
use crate::infrastructure::sql::space_store::SqlSpaceStore;
use crate::ports::space_store::{DriveSpaceStore, NewDriveSpace};
use crate::DriveProductError;
use sqlx::AnyPool;

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
pub struct SqlDriveSpaceService {
    service: DriveSpaceService<SqlSpaceStore>,
}

impl SqlDriveSpaceService {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            service: DriveSpaceService::new(SqlSpaceStore::new(pool)),
        }
    }

    pub async fn create_space(
        &self,
        command: CreateSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        self.service.create_space(command).await
    }

    pub async fn list_spaces(
        &self,
        command: ListSpacesCommand,
    ) -> Result<Vec<DriveSpace>, DriveProductError> {
        self.service.list_spaces(command).await
    }

    pub async fn get_space(
        &self,
        command: GetSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        self.service.get_space(command).await
    }

    pub async fn update_space(
        &self,
        command: UpdateSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        self.service.update_space(command).await
    }

    pub async fn delete_space(
        &self,
        command: DeleteSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        self.service.delete_space(command).await
    }
}

#[derive(Debug, Clone)]
pub struct GetSpaceCommand {
    pub tenant_id: String,
    pub space_id: String,
}

#[derive(Debug, Clone)]
pub struct UpdateSpaceCommand {
    pub tenant_id: String,
    pub space_id: String,
    pub display_name: Option<String>,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct DeleteSpaceCommand {
    pub tenant_id: String,
    pub space_id: String,
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
        let id = require_non_empty(command.id, "space id")?;
        let tenant_id = require_non_empty(command.tenant_id, "tenant_id")?;
        let owner_subject_type = require_owner_subject_type(command.owner_subject_type)?;
        let owner_subject_id = require_non_empty(command.owner_subject_id, "owner_subject_id")?;
        let display_name = require_non_empty(command.display_name, "display_name")?;
        let operator_id = require_non_empty(command.operator_id, "operator_id")?;
        if command.space_type.requires_user_owner() && owner_subject_type != "user" {
            return Err(DriveProductError::Validation(format!(
                "{} must be owned by a user",
                command.space_type.display_label()
            )));
        }

        let new_space = NewDriveSpace {
            id,
            tenant_id,
            owner_subject_type,
            owner_subject_id,
            display_name,
            space_type: command.space_type.as_str().to_string(),
            lifecycle_status: "active".to_string(),
            created_by: operator_id.clone(),
            updated_by: operator_id,
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

    pub async fn get_space(
        &self,
        command: GetSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        let tenant_id = require_non_empty(command.tenant_id, "tenant_id")?;
        let space_id = require_non_empty(command.space_id, "space_id")?;
        self.store.get_space(&tenant_id, &space_id).await
    }

    pub async fn update_space(
        &self,
        command: UpdateSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        let tenant_id = require_non_empty(command.tenant_id, "tenant_id")?;
        let space_id = require_non_empty(command.space_id, "space_id")?;
        let operator_id = require_non_empty(command.operator_id, "operator_id")?;
        let display_name = match command.display_name {
            Some(value) => require_non_empty(value, "display_name")?,
            None => {
                return self.store.get_space(&tenant_id, &space_id).await;
            }
        };
        self.store
            .update_space(&tenant_id, &space_id, &display_name, &operator_id)
            .await
    }

    pub async fn delete_space(
        &self,
        command: DeleteSpaceCommand,
    ) -> Result<DriveSpace, DriveProductError> {
        let tenant_id = require_non_empty(command.tenant_id, "tenant_id")?;
        let space_id = require_non_empty(command.space_id, "space_id")?;
        let operator_id = require_non_empty(command.operator_id, "operator_id")?;
        let existing = self.store.get_space(&tenant_id, &space_id).await?;
        if existing.space_type.is_non_deletable() {
            return Err(DriveProductError::Validation(format!(
                "{} cannot be deleted",
                existing.space_type.display_label()
            )));
        }
        self.store
            .delete_space(&tenant_id, &space_id, &operator_id)
            .await
    }
}

#[derive(Debug, Clone)]
pub struct ListSpacesCommand {
    pub tenant_id: String,
    pub owner_subject_type: Option<String>,
    pub owner_subject_id: Option<String>,
}

fn require_non_empty(value: String, field_name: &str) -> Result<String, DriveProductError> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(DriveProductError::Validation(format!(
            "{field_name} is required"
        )));
    }
    Ok(trimmed)
}

fn require_owner_subject_type(value: String) -> Result<String, DriveProductError> {
    let owner_subject_type = require_non_empty(value, "owner_subject_type")?;
    match owner_subject_type.as_str() {
        "app" | "user" | "group" | "organization" => Ok(owner_subject_type),
        _ => Err(DriveProductError::Validation(
            "owner_subject_type must be app, user, group, or organization".to_string(),
        )),
    }
}
