fn main() {
    let attributes = tauri_build::Attributes::new()
        .app_manifest(tauri_build::AppManifest::new().commands(&[
            "window_control",
            "local_filesystem_list",
            "local_filesystem_open",
            "local_upload_pick_files",
            "local_upload_describe_file",
            "local_upload_read_range",
            "local_upload_checksum_file",
        ]));

    tauri_build::try_build(attributes).expect("failed to run SDKWork Drive desktop build script");
}
