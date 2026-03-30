use std::{collections::HashMap, path::Path};

#[tauri::command]
pub fn desktop_path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub async fn desktop_write_binary_file(path: String, content: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|error| error.to_string())?;
    }

    tokio::fs::write(path, content)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_read_binary_file(path: String) -> Result<Vec<u8>, String> {
    tokio::fs::read(path)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_pick_files() -> Result<Vec<String>, String> {
    let files = rfd::AsyncFileDialog::new()
        .pick_files()
        .await
        .unwrap_or_default();

    Ok(files
        .into_iter()
        .map(|file| file.path().to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub async fn desktop_download_to_file(
    url: String,
    destination_path: String,
    headers: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|error| error.to_string())?;

    let mut request = client.get(url);
    if let Some(header_map) = headers {
        for (key, value) in header_map {
            if key.trim().is_empty() || value.trim().is_empty() {
                continue;
            }

            request = request.header(key, value);
        }
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("Download request failed with status {status}."));
    }

    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    if let Some(parent) = Path::new(&destination_path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|error| error.to_string())?;
    }

    tokio::fs::write(destination_path, bytes)
        .await
        .map_err(|error| error.to_string())
}
