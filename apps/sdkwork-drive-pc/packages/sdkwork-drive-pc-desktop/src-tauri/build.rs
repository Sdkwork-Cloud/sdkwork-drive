fn main() {
    let attributes = tauri_build::Attributes::new()
        .app_manifest(tauri_build::AppManifest::new().commands(&["window_control"]));

    tauri_build::try_build(attributes).expect("failed to run SDKWork Drive desktop build script");
}
