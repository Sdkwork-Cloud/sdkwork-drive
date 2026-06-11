use serde::Deserialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WindowControlRequest {
    action: WindowControlAction,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum WindowControlAction {
    Minimize,
    Maximize,
    Unmaximize,
    Close,
    Show,
}

#[tauri::command]
fn window_control(app: AppHandle, request: WindowControlRequest) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;

    match request.action {
        WindowControlAction::Minimize => window.minimize(),
        WindowControlAction::Maximize => window.maximize(),
        WindowControlAction::Unmaximize => window.unmaximize(),
        WindowControlAction::Close => window.close(),
        WindowControlAction::Show => window.show(),
    }
    .map_err(|_| "window control failed".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![window_control])
        .run(tauri::generate_context!())
        .expect("failed to run SDKWork Drive desktop host");
}
