use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MediaResource {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,

    #[serde(rename = "fileName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,

    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    #[serde(rename = "sizeBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checksum: Option<serde_json::Value>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Legacy alias for id.
    #[serde(rename = "mediaResourceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_resource_id: Option<String>,

    /// Legacy alias for kind.
    #[serde(rename = "mediaType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,

    /// Legacy alias for mimeType.
    #[serde(rename = "contentType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    #[serde(rename = "durationMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,

    /// Legacy checksum field.
    #[serde(rename = "checksumSha256")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checksum_sha256: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, serde_json::Value>>,
}
