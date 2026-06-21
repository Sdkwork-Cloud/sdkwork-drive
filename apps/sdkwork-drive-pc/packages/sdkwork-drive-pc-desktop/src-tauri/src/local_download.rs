use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDownloadSaveRequest {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDownloadSaveResponse {
    pub saved: bool,
    pub path: Option<String>,
}

fn sanitize_download_file_name(file_name: &str) -> String {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return "download.bin".to_string();
    }
    trimmed
        .replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_")
}

pub fn save_download_file(
    request: LocalDownloadSaveRequest,
) -> Result<LocalDownloadSaveResponse, String> {
    let default_name = sanitize_download_file_name(&request.file_name);
    let Some(path) = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .save_file()
    else {
        return Ok(LocalDownloadSaveResponse {
            saved: false,
            path: None,
        });
    };

    let parent = Path::new(&path).parent();
    if let Some(parent) = parent {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create download directory: {error}"))?;
        }
    }

    fs::write(&path, &request.bytes)
        .map_err(|error| format!("failed to write download file: {error}"))?;
    Ok(LocalDownloadSaveResponse {
        saved: true,
        path: Some(path.to_string_lossy().into_owned()),
    })
}
