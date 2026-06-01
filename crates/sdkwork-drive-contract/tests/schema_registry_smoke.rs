use std::path::PathBuf;

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

#[test]
fn schema_registry_includes_special_space_profiles() {
    let doc = std::fs::read_to_string(
        workspace_root().join("docs/schema-registry/tables/002-drive-special-spaces.yaml"),
    )
    .expect("special spaces schema file missing");
    assert!(doc.contains("drive_knowledge_space_profile"));
    assert!(doc.contains("drive_ai_generation_space_profile"));
    assert!(doc.contains("drive_app_upload_space_profile"));
}

#[test]
fn schema_registry_includes_audit_indexes_for_filters() {
    let doc = std::fs::read_to_string(
        workspace_root().join("docs/schema-registry/tables/004-drive-security-audit.yaml"),
    )
    .expect("security audit schema file missing");
    assert!(doc.contains("ix_drive_audit_event_tenant_created"));
    assert!(doc.contains("ix_drive_audit_event_resource"));
    assert!(doc.contains("ix_drive_audit_event_action_created"));
    assert!(doc.contains("ix_drive_audit_event_request_created"));
    assert!(doc.contains("ix_drive_audit_event_trace_created"));
}

#[test]
fn schema_registry_includes_storage_provider_kind_dictionary() {
    let doc = std::fs::read_to_string(
        workspace_root().join("docs/schema-registry/tables/003-drive-storage.yaml"),
    )
    .expect("storage schema file missing");
    assert!(doc.contains("provider_kind"));
    assert!(doc.contains("local_filesystem"));
    assert!(doc.contains("s3_compatible"));
    assert!(doc.contains("azure_blob"));
    assert!(doc.contains("google_cloud_storage"));
    assert!(doc.contains("aliyun_oss"));
    assert!(doc.contains("custom:[a-z0-9_-]{2,32}"));
}
