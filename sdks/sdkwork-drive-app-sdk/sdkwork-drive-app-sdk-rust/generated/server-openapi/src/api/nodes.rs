use std::sync::Arc;

use crate::api::paths::app_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{CreateShortcutRequest, DriveNode};

#[derive(Clone)]
pub struct NodesApi {
    client: Arc<SdkworkHttpClient>,
}

impl NodesApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create a shortcut node
    pub async fn shortcuts_create(&self, body: &CreateShortcutRequest) -> Result<DriveNode, SdkworkError> {
        let path = app_path(&"/drive/nodes/shortcuts".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
