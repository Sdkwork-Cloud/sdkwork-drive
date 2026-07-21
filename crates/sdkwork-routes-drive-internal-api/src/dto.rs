use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateRootScopeSubscriptionRequest {
    pub space_id: String,
    pub knowledge_base_id: String,
    pub raw_folder_node_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResolveDriveResourceRequest {
    pub scope_type: String,
    pub scope_uuid: String,
    pub relative_path: String,
    pub pinned_generation: Option<String>,
    pub pinned_node_version_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RetrieveDriveResourceContentQuery {
    pub scope_type: String,
    pub scope_uuid: String,
    pub relative_path: String,
    pub pinned_generation: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RootScopeSubscriptionResponse {
    pub uuid: String,
    pub space_id: String,
    pub consumer_kind: String,
    pub consumer_resource_id: String,
    pub root_node_id: String,
    pub scope_status: String,
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveResourceResolutionResponse {
    pub scope_type: String,
    pub scope_uuid: String,
    pub scope_generation: String,
    pub normalized_relative_path: String,
    pub resource_type: String,
    pub node_id: String,
    pub logical_node_version_id: String,
    pub version_no: String,
    pub checksum_sha256_hex: String,
    pub etag: String,
    pub content_type: String,
    pub content_length: String,
    pub last_modified: String,
    pub scope_status: String,
    pub node_status: String,
    pub eligibility: String,
}
