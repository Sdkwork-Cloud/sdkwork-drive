//! Versioned cross-service Drive event contracts.

use serde::{Deserialize, Serialize};

pub const EVENT_SPEC_VERSION: &str = "1.0";
pub const EVENT_SOURCE: &str = "sdkwork-drive";

/// CloudEvents-aligned envelope used by Drive's cross-service event authority.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveEventEnvelope<T> {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub source: String,
    pub specversion: String,
    pub time: String,
    pub tenant_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    pub subject: String,
    pub actor_id: String,
    /// Per-Space monotonic checkpoint. Serialized as an int64 string.
    pub sequence_no: String,
    pub data: T,
}

impl<T> DriveEventEnvelope<T> {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: impl Into<String>,
        event_type: impl Into<String>,
        time: impl Into<String>,
        tenant_id: impl Into<String>,
        organization_id: Option<String>,
        subject: impl Into<String>,
        actor_id: impl Into<String>,
        sequence_no: i64,
        data: T,
    ) -> Self {
        Self {
            id: id.into(),
            event_type: event_type.into(),
            source: EVENT_SOURCE.to_string(),
            specversion: EVENT_SPEC_VERSION.to_string(),
            time: time.into(),
            tenant_id: tenant_id.into(),
            organization_id,
            subject: subject.into(),
            actor_id: actor_id.into(),
            sequence_no: sequence_no.to_string(),
            data,
        }
    }
}

/// A Drive-authorized root subscription affected by a node mutation.
///
/// Consumers must act only on entries addressed to their registered scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveRootScopeEffect {
    pub scope_id: String,
    pub scope_kind: DriveRootScopeKind,
    pub relative_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub root_generation: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DriveRootScopeKind {
    WebsiteRoot,
    KnowledgebaseRaw,
}

/// Payload for `drive.node.version.committed.v1`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveNodeVersionCommittedV1Data {
    pub operation_id: String,
    pub space_id: String,
    pub node_id: String,
    pub drive_uri: String,
    pub drive_version_id: String,
    /// Logical Drive version number, serialized as an int64 string.
    pub version_no: String,
    pub space_relative_path: String,
    pub content_type: String,
    /// Content length in bytes, serialized as an int64 string.
    pub content_length: String,
    pub checksum_sha256_hex: String,
    pub root_scopes: Vec<DriveRootScopeEffect>,
}

/// Payload for `drive.node.path.changed.v1`.
///
/// Both root-scope sets are authoritative. Consumers must not reconstruct
/// membership by walking an unqualified node path.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveNodePathChangedV1Data {
    pub operation_id: String,
    pub space_id: String,
    pub node_id: String,
    pub drive_uri: String,
    pub old_space_relative_path: String,
    pub new_space_relative_path: String,
    pub old_root_scopes: Vec<DriveRootScopeEffect>,
    pub new_root_scopes: Vec<DriveRootScopeEffect>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DriveNodeEligibility {
    Eligible,
    Ineligible,
}

/// Payload for `drive.node.eligibility.changed.v1`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveNodeEligibilityChangedV1Data {
    pub operation_id: String,
    pub space_id: String,
    pub node_id: String,
    pub drive_uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drive_version_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version_no: Option<String>,
    pub space_relative_path: String,
    pub old_eligibility: DriveNodeEligibility,
    pub new_eligibility: DriveNodeEligibility,
    pub reason: String,
    pub root_scopes: Vec<DriveRootScopeEffect>,
}

/// Payload for `drive.node.deleted.v1`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveNodeDeletedV1Data {
    pub operation_id: String,
    pub space_id: String,
    pub node_id: String,
    pub drive_uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub drive_version_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version_no: Option<String>,
    pub last_space_relative_path: String,
    pub deletion_reason: String,
    pub root_scopes: Vec<DriveRootScopeEffect>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_version_event_uses_cloud_event_fields_and_int64_strings() {
        let envelope = DriveEventEnvelope::new(
            "event-1",
            "drive.node.version.committed.v1",
            "2026-07-21T00:00:00.000Z",
            "tenant-1",
            Some("organization-1".to_string()),
            "drive://spaces/space-1/nodes/node-1",
            "user-1",
            42,
            DriveNodeVersionCommittedV1Data {
                operation_id: "upload-1".to_string(),
                space_id: "space-1".to_string(),
                node_id: "node-1".to_string(),
                drive_uri: "drive://spaces/space-1/nodes/node-1".to_string(),
                drive_version_id: "version-1".to_string(),
                version_no: "7".to_string(),
                space_relative_path: "docs/index.md".to_string(),
                content_type: "text/markdown".to_string(),
                content_length: "1024".to_string(),
                checksum_sha256_hex: format!("sha256:{}", "a".repeat(64)),
                root_scopes: Vec::new(),
            },
        );

        let value = serde_json::to_value(envelope).expect("event should serialize");
        assert_eq!(value["type"], "drive.node.version.committed.v1");
        assert_eq!(value["specversion"], "1.0");
        assert_eq!(value["sequenceNo"], "42");
        assert_eq!(value["data"]["versionNo"], "7");
        assert_eq!(value["data"]["contentLength"], "1024");
        assert!(value["data"].get("objectKey").is_none());
    }

    #[test]
    fn path_change_event_keeps_old_and_new_root_qualified_paths() {
        let envelope = DriveEventEnvelope::new(
            "event-2",
            "drive.node.path.changed.v1",
            "2026-07-21T00:00:00.000Z",
            "tenant-1",
            None,
            "drive://spaces/space-1/nodes/node-1",
            "user-1",
            43,
            DriveNodePathChangedV1Data {
                operation_id: "request-1".to_string(),
                space_id: "space-1".to_string(),
                node_id: "node-1".to_string(),
                drive_uri: "drive://spaces/space-1/nodes/node-1".to_string(),
                old_space_relative_path: "draft/index.md".to_string(),
                new_space_relative_path: "docs/index.md".to_string(),
                old_root_scopes: vec![DriveRootScopeEffect {
                    scope_id: "scope-1".to_string(),
                    scope_kind: DriveRootScopeKind::KnowledgebaseRaw,
                    relative_path: "draft/index.md".to_string(),
                    root_generation: None,
                }],
                new_root_scopes: vec![DriveRootScopeEffect {
                    scope_id: "scope-1".to_string(),
                    scope_kind: DriveRootScopeKind::KnowledgebaseRaw,
                    relative_path: "docs/index.md".to_string(),
                    root_generation: None,
                }],
            },
        );

        let value = serde_json::to_value(envelope).expect("event should serialize");
        assert_eq!(value["type"], "drive.node.path.changed.v1");
        assert_eq!(
            value["data"]["oldRootScopes"][0]["relativePath"],
            "draft/index.md"
        );
        assert_eq!(
            value["data"]["newRootScopes"][0]["relativePath"],
            "docs/index.md"
        );
    }

    #[test]
    fn eligibility_and_delete_events_do_not_expose_storage_locators() {
        let eligibility = DriveNodeEligibilityChangedV1Data {
            operation_id: "request-2".to_string(),
            space_id: "space-1".to_string(),
            node_id: "node-1".to_string(),
            drive_uri: "drive://spaces/space-1/nodes/node-1".to_string(),
            drive_version_id: Some("version-1".to_string()),
            version_no: Some("8".to_string()),
            space_relative_path: "docs/index.md".to_string(),
            old_eligibility: DriveNodeEligibility::Eligible,
            new_eligibility: DriveNodeEligibility::Ineligible,
            reason: "NODE_TRASHED".to_string(),
            root_scopes: Vec::new(),
        };
        let deleted = DriveNodeDeletedV1Data {
            operation_id: "request-3".to_string(),
            space_id: "space-1".to_string(),
            node_id: "node-1".to_string(),
            drive_uri: "drive://spaces/space-1/nodes/node-1".to_string(),
            drive_version_id: Some("version-1".to_string()),
            version_no: Some("8".to_string()),
            last_space_relative_path: "docs/index.md".to_string(),
            deletion_reason: "PERMANENT_DELETE".to_string(),
            root_scopes: Vec::new(),
        };

        let serialized = serde_json::to_string(&(eligibility, deleted))
            .expect("lifecycle events should serialize");
        assert!(serialized.contains("INELIGIBLE"));
        assert!(serialized.contains("lastSpaceRelativePath"));
        for forbidden in ["objectKey", "bucketName", "presignedUrl", "credential"] {
            assert!(!serialized.contains(forbidden));
        }
    }
}
