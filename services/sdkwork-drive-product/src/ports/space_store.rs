use async_trait::async_trait;

use crate::domain::space::DriveSpace;
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct NewDriveSpace {
    pub id: String,
    pub tenant_id: String,
    pub owner_subject_type: String,
    pub owner_subject_id: String,
    pub display_name: String,
    pub space_type: String,
    pub lifecycle_status: String,
    pub created_by: String,
    pub updated_by: String,
}

#[async_trait]
pub trait DriveSpaceStore: Send + Sync {
    async fn insert_space(
        &self,
        new_space: &NewDriveSpace,
    ) -> Result<DriveSpace, DriveProductError>;

    async fn list_spaces(
        &self,
        tenant_id: &str,
        owner_subject_type: Option<&str>,
        owner_subject_id: Option<&str>,
    ) -> Result<Vec<DriveSpace>, DriveProductError>;
}
