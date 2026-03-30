#[tauri::command]
pub fn desktop_get_downloads_dir() -> Result<String, String> {
    let downloads_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|home| home.join("Downloads")))
        .ok_or_else(|| "Unable to resolve a Downloads directory.".to_string())?;

    Ok(downloads_dir.to_string_lossy().to_string())
}
