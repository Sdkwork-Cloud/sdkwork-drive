use std::path::PathBuf;

#[test]
fn workspace_declares_expected_members() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let manifest_path = root.join("Cargo.toml");
    let manifest = std::fs::read_to_string(manifest_path).expect("Cargo.toml must exist");
    assert!(manifest.contains("crates/sdkwork-drive-contract"));
    assert!(manifest.contains("services/sdkwork-drive-product"));
}

#[test]
fn observability_event_dictionary_spec_exists() {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    let spec_path =
        root.join("docs/superpowers/specs/2026-06-01-drive-observability-event-dictionary.md");
    let spec = std::fs::read_to_string(spec_path)
        .expect("observability event dictionary spec should exist");
    assert!(spec.contains("sdkwork.drive"));
    assert!(spec.contains("drive.audit_events.list"));
    assert!(spec.contains("drive.app.download_tokens.resolve"));
}
