use std::sync::Arc;

use crate::api::{
    AssetsApi, DriveApi, NodeLabelsApi, NodePropertiesApi, NodesApi, WatchChannelsApi,
};
use crate::http::{SdkworkConfig, SdkworkError, SdkworkHttpClient};

#[derive(Clone)]
pub struct SdkworkAppClient {
    http: Arc<SdkworkHttpClient>,
}

impl SdkworkAppClient {
    pub fn new(config: SdkworkConfig) -> Result<Self, SdkworkError> {
        Ok(Self {
            http: Arc::new(SdkworkHttpClient::new(config)?),
        })
    }

    pub fn new_with_base_url(base_url: impl Into<String>) -> Result<Self, SdkworkError> {
        Self::new(SdkworkConfig::new(base_url))
    }
    pub fn set_auth_token(&self, token: impl Into<String>) -> &Self {
        self.http.set_auth_token(token);
        self
    }

    pub fn set_access_token(&self, token: impl Into<String>) -> &Self {
        self.http.set_access_token(token);
        self
    }

    pub fn set_header(&self, key: impl Into<String>, value: impl Into<String>) -> &Self {
        self.http.set_header(key, value);
        self
    }

    pub fn http_client(&self) -> Arc<SdkworkHttpClient> {
        Arc::clone(&self.http)
    }

    pub fn drive(&self) -> DriveApi {
        DriveApi::new(Arc::clone(&self.http))
    }

    pub fn node_labels(&self) -> NodeLabelsApi {
        NodeLabelsApi::new(Arc::clone(&self.http))
    }

    pub fn node_properties(&self) -> NodePropertiesApi {
        NodePropertiesApi::new(Arc::clone(&self.http))
    }

    pub fn nodes(&self) -> NodesApi {
        NodesApi::new(Arc::clone(&self.http))
    }

    pub fn watch_channels(&self) -> WatchChannelsApi {
        WatchChannelsApi::new(Arc::clone(&self.http))
    }

    pub fn assets(&self) -> AssetsApi {
        AssetsApi::new(Arc::clone(&self.http))
    }
}
