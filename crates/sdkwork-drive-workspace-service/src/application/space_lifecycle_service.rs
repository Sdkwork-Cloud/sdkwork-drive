use sdkwork_drive_contract::drive::domain_events as drive_events;

use crate::application::permission_service::SqlDrivePermissionService;
use crate::infrastructure::change_recorder::{record_drive_change, RecordDriveChangeCommand};
use crate::infrastructure::sql::space_lifecycle_store::SqlSpaceLifecycleStore;
use crate::ports::permission_store::GrantDriveNodePermissionCommand;
use crate::DriveServiceError;

#[derive(Debug, Clone)]
pub struct BootstrapTeamSpaceCreatorAccessCommand {
    pub tenant_id: String,
    pub space_id: String,
    pub creator_user_id: String,
    pub display_name: String,
    pub root_folder_id: String,
}

#[derive(Debug, Clone)]
pub struct RetireSpaceContentsCommand {
    pub tenant_id: String,
    pub space_id: String,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct SqlDriveSpaceLifecycleService {
    lifecycle_store: SqlSpaceLifecycleStore,
    permission_service: SqlDrivePermissionService,
    pool: sqlx::AnyPool,
}

impl SqlDriveSpaceLifecycleService {
    pub fn new(pool: sqlx::AnyPool) -> Self {
        Self {
            lifecycle_store: SqlSpaceLifecycleStore::new(pool.clone()),
            permission_service: SqlDrivePermissionService::new(pool.clone()),
            pool,
        }
    }

    pub async fn bootstrap_team_space_creator_access(
        &self,
        command: BootstrapTeamSpaceCreatorAccessCommand,
    ) -> Result<(), DriveServiceError> {
        let existing_root = self
            .lifecycle_store
            .find_active_root_folder_id(&command.tenant_id, &command.space_id)
            .await?;

        let root_folder_id = if let Some(root_folder_id) = existing_root {
            root_folder_id
        } else {
            let root_name = command.display_name.trim();
            let root_name = if root_name.is_empty() {
                "Shared space"
            } else {
                root_name
            };
            self.lifecycle_store
                .insert_team_space_root_folder(
                    &command.root_folder_id,
                    &command.tenant_id,
                    &command.space_id,
                    root_name,
                    &command.creator_user_id,
                )
                .await?;
            record_drive_change(
                &self.pool,
                RecordDriveChangeCommand {
                    tenant_id: &command.tenant_id,
                    space_id: &command.space_id,
                    node_id: Some(&command.root_folder_id),
                    event_type: drive_events::node::CREATED,
                    actor_id: &command.creator_user_id,
                },
            )
            .await?;
            command.root_folder_id
        };

        self.permission_service
            .grant_node_permission(GrantDriveNodePermissionCommand {
                tenant_id: command.tenant_id,
                node_id: root_folder_id,
                subject_type: "user".to_string(),
                subject_id: command.creator_user_id.clone(),
                role: "owner".to_string(),
                operator_id: command.creator_user_id,
            })
            .await?;

        Ok(())
    }

    pub async fn retire_space_contents(
        &self,
        command: RetireSpaceContentsCommand,
    ) -> Result<i64, DriveServiceError> {
        self.lifecycle_store
            .retire_space_contents(&command.tenant_id, &command.space_id, &command.operator_id)
            .await
    }
}
