use serde::{Deserialize, Serialize};

use crate::models::DriveSpace;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListSpacesResponse {
    pub items: Vec<DriveSpace>,
}
