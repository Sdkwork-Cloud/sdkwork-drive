mod app;
mod commands;
mod platform;
mod state;

pub fn run() {
    tauri::Builder::default()
        .manage(state::ShutdownIntent::default())
        .setup(app::bootstrap::setup)
        .on_window_event(app::bootstrap::handle_window_event)
        .invoke_handler(tauri::generate_handler![
            commands::app_info::desktop_get_app_info,
            commands::downloads::desktop_get_downloads_dir,
            commands::filesystem::desktop_path_exists,
            commands::filesystem::desktop_write_binary_file,
            commands::filesystem::desktop_read_binary_file,
            commands::filesystem::desktop_pick_files,
            commands::filesystem::desktop_download_to_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running sdkwork drive desktop host");
}
