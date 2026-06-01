use crate::domain::node::{DriveNode, DriveNodeType};
use crate::ports::node_store::{DriveNodeStore, NewDriveNode};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct CreateNodeCommand {
    pub id: String,
    pub tenant_id: String,
    pub space_id: String,
    pub parent_node_id: Option<String>,
    pub node_type: DriveNodeType,
    pub node_name: String,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct DriveNodeService<S>
where
    S: DriveNodeStore,
{
    store: S,
}

impl<S> DriveNodeService<S>
where
    S: DriveNodeStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn create_node(
        &self,
        command: CreateNodeCommand,
    ) -> Result<DriveNode, DriveProductError> {
        if command.id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "node id is required".to_string(),
            ));
        }
        if command.node_name.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "node_name is required".to_string(),
            ));
        }

        let duplicated = self
            .store
            .exists_live_name_in_parent(
                &command.tenant_id,
                &command.space_id,
                command.parent_node_id.as_deref(),
                &command.node_name,
            )
            .await?;
        if duplicated {
            return Err(DriveProductError::Conflict(format!(
                "node name already exists in parent: {}",
                command.node_name
            )));
        }

        let new_node = NewDriveNode {
            id: command.id,
            tenant_id: command.tenant_id,
            space_id: command.space_id,
            parent_node_id: command.parent_node_id,
            node_type: command.node_type.as_str().to_string(),
            node_name: command.node_name,
            lifecycle_status: "active".to_string(),
            created_by: command.operator_id.clone(),
            updated_by: command.operator_id,
        };

        self.store.insert_node(&new_node).await
    }
}
