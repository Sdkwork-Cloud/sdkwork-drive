use serde::Serialize;

#[derive(Serialize)]
pub struct DesktopAppInfo {
    name: String,
    version: String,
    target: String,
    arch: String,
}

#[tauri::command]
pub fn desktop_get_app_info() -> DesktopAppInfo {
    DesktopAppInfo {
        name: "SDKWork Drive".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        target: crate::platform::current_target().to_string(),
        arch: crate::platform::current_arch().to_string(),
    }
}
