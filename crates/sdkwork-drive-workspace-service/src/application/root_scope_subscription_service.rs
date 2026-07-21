use crate::domain::root_scope_subscription::DriveRootScopeSubscription;
use crate::infrastructure::sql::root_scope_subscription_store::SqlRootScopeSubscriptionStore;
use crate::ports::root_scope_subscription_store::{
    DriveRootScopeSubscriptionStore, RegisterDriveRootScopeSubscription,
    RegisterDriveRootScopeSubscriptionResult,
};
use crate::DriveServiceError;

#[derive(Debug, Clone)]
pub struct RegisterKnowledgebaseRawScopeCommand {
    pub tenant_id: String,
    pub space_id: String,
    pub knowledge_base_id: String,
    pub raw_folder_node_id: String,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct GetRootScopeSubscriptionCommand {
    pub tenant_id: String,
    pub subscription_uuid: String,
}

#[derive(Debug, Clone)]
pub struct DriveRootScopeSubscriptionService<S>
where
    S: DriveRootScopeSubscriptionStore,
{
    store: S,
}

impl<S> DriveRootScopeSubscriptionService<S>
where
    S: DriveRootScopeSubscriptionStore,
{
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn register_knowledgebase_raw(
        &self,
        command: RegisterKnowledgebaseRawScopeCommand,
    ) -> Result<RegisterDriveRootScopeSubscriptionResult, DriveServiceError> {
        self.store
            .register_knowledgebase_raw(&RegisterDriveRootScopeSubscription {
                tenant_id: require_text(command.tenant_id, "tenant_id", 64)?,
                space_id: require_text(command.space_id, "space_id", 64)?,
                consumer_resource_id: require_text(
                    command.knowledge_base_id,
                    "knowledge_base_id",
                    128,
                )?,
                root_node_id: require_text(command.raw_folder_node_id, "raw_folder_node_id", 64)?,
                operator_id: require_text(command.operator_id, "operator_id", 128)?,
            })
            .await
    }

    pub async fn get_subscription(
        &self,
        command: GetRootScopeSubscriptionCommand,
    ) -> Result<DriveRootScopeSubscription, DriveServiceError> {
        self.store
            .get_by_uuid(
                &require_text(command.tenant_id, "tenant_id", 64)?,
                &require_text(command.subscription_uuid, "subscription_uuid", 64)?,
            )
            .await
    }
}

pub type SqlDriveRootScopeSubscriptionService =
    DriveRootScopeSubscriptionService<SqlRootScopeSubscriptionStore>;

fn require_text(
    value: String,
    field_name: &str,
    max_length: usize,
) -> Result<String, DriveServiceError> {
    let value = value.trim().to_string();
    if value.is_empty() || value.len() > max_length {
        return Err(DriveServiceError::Validation(format!(
            "{field_name} must contain between 1 and {max_length} characters"
        )));
    }
    Ok(value)
}
