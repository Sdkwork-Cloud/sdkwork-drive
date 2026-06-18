use sqlx::AnyPool;

use crate::infrastructure::sql::permission_store::SqlDrivePermissionStore;
use crate::ports::permission_store::DrivePermissionStore;
use crate::DriveServiceError;

pub use crate::ports::permission_store::{
    CheckDriveNodePermissionCommand, DriveNodePermissionCheck, DriveNodePermissionGrant,
    DriveNodePermissionList, GrantDriveNodePermissionCommand, ListDriveNodePermissionsCommand,
    RevokeDriveNodePermissionCommand,
};

#[derive(Debug, Clone)]
pub struct SqlDrivePermissionService {
    store: SqlDrivePermissionStore,
}

impl SqlDrivePermissionService {
    pub fn new(pool: AnyPool) -> Self {
        Self {
            store: SqlDrivePermissionStore::new(pool),
        }
    }

    pub async fn resolve_space_permission_anchor_node(
        &self,
        tenant_id: &str,
        space_id: &str,
    ) -> Result<String, DriveServiceError> {
        self.store
            .resolve_space_permission_anchor_node(tenant_id, space_id)
            .await
    }

    pub async fn grant_node_permission(
        &self,
        command: GrantDriveNodePermissionCommand,
    ) -> Result<DriveNodePermissionGrant, DriveServiceError> {
        self.store.grant_node_permission(command).await
    }

    pub async fn revoke_node_permission(
        &self,
        command: RevokeDriveNodePermissionCommand,
    ) -> Result<(), DriveServiceError> {
        self.store.revoke_node_permission(command).await
    }

    pub async fn list_node_permissions(
        &self,
        command: ListDriveNodePermissionsCommand,
    ) -> Result<DriveNodePermissionList, DriveServiceError> {
        self.store.list_node_permissions(command).await
    }

    pub async fn check_node_permission(
        &self,
        command: CheckDriveNodePermissionCommand,
    ) -> Result<DriveNodePermissionCheck, DriveServiceError> {
        self.store.check_node_permission(command).await
    }
}
