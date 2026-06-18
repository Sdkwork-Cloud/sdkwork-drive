use async_trait::async_trait;

use crate::DriveServiceError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveNodePermissionGrant {
    pub id: String,
    pub node_id: String,
    pub subject_type: String,
    pub subject_id: String,
    pub role: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveNodePermissionCheck {
    pub allowed: bool,
    pub effective_role: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveNodePermissionList {
    pub items: Vec<DriveNodePermissionGrant>,
    pub next_page_token: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GrantDriveNodePermissionCommand {
    pub tenant_id: String,
    pub node_id: String,
    pub subject_type: String,
    pub subject_id: String,
    pub role: String,
    pub operator_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RevokeDriveNodePermissionCommand {
    pub tenant_id: String,
    pub node_id: String,
    pub subject_type: String,
    pub subject_id: String,
    pub operator_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListDriveNodePermissionsCommand {
    pub tenant_id: String,
    pub node_id: String,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckDriveNodePermissionCommand {
    pub tenant_id: String,
    pub node_id: String,
    pub subject_type: String,
    pub subject_id: String,
    pub required_role: String,
}

#[async_trait]
pub trait DrivePermissionStore: Send + Sync {
    async fn resolve_space_permission_anchor_node(
        &self,
        tenant_id: &str,
        space_id: &str,
    ) -> Result<String, DriveServiceError>;

    async fn grant_node_permission(
        &self,
        command: GrantDriveNodePermissionCommand,
    ) -> Result<DriveNodePermissionGrant, DriveServiceError>;

    async fn revoke_node_permission(
        &self,
        command: RevokeDriveNodePermissionCommand,
    ) -> Result<(), DriveServiceError>;

    async fn list_node_permissions(
        &self,
        command: ListDriveNodePermissionsCommand,
    ) -> Result<DriveNodePermissionList, DriveServiceError>;

    async fn check_node_permission(
        &self,
        command: CheckDriveNodePermissionCommand,
    ) -> Result<DriveNodePermissionCheck, DriveServiceError>;
}
