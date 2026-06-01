use std::path::PathBuf;

fn workspace_root() -> PathBuf {
    let mut root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    root.pop();
    root.pop();
    root
}

#[test]
fn sdk_assemblies_use_sdkwork_v3_profile() {
    let app =
        std::fs::read_to_string(workspace_root().join("sdks/drive-app-sdk/bin/generate-sdk.mjs"))
            .expect("app sdk generate script missing");
    let backend = std::fs::read_to_string(
        workspace_root().join("sdks/drive-backend-sdk/bin/generate-sdk.mjs"),
    )
    .expect("backend sdk generate script missing");
    assert!(app.contains("--standard-profile"));
    assert!(backend.contains("sdkwork-v3"));
}
