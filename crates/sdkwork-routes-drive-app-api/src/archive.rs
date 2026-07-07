use crate::constants::{ARCHIVE_MAX_ENTRIES, ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES};
use crate::dto::{ArchiveEntryResponse, DriveNodeResponse, SafeArchivePath};
use crate::error::{internal_problem, problem, ProblemDetail, SdkWorkResultCode};
use crate::hashing::sha256_hex;
use axum::http::StatusCode;
use axum::Json;
use std::collections::BTreeSet;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use zip::ZipArchive;

type ArchiveZipReader = ZipArchive<Cursor<Vec<u8>>>;

#[derive(Debug, Clone)]
pub(crate) struct ArchiveFileForExtract {
    pub(crate) path: SafeArchivePath,
    pub(crate) content_type: String,
    pub(crate) content: Vec<u8>,
    pub(crate) checksum_sha256_hex: String,
}

pub(crate) fn validate_archive_source_node(
    node: &DriveNodeResponse,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if node.node_type == "file" {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "archiveEntries can only be used with file nodes",
        SdkWorkResultCode::ValidationError,
    ))
}

pub(crate) fn is_supported_archive_content(node_name: &str, content_type: &str) -> bool {
    let lower_name = node_name.to_ascii_lowercase();
    let lower_content_type = content_type.to_ascii_lowercase();
    lower_name.ends_with(".zip")
        || lower_content_type == "application/zip"
        || lower_content_type == "application/x-zip-compressed"
}

pub(crate) fn read_archive_entry_list(
    archive_bytes: &[u8],
) -> Result<Vec<ArchiveEntryResponse>, (StatusCode, Json<ProblemDetail>)> {
    let mut archive = open_zip_archive(archive_bytes)?;
    validate_archive_entry_count(archive.len())?;
    let mut items = Vec::with_capacity(archive.len());
    let mut total_uncompressed = 0_i64;
    for index in 0..archive.len() {
        let file = archive.by_index(index).map_err(map_zip_archive_error)?;
        let is_directory = file.is_dir();
        let safe_path = safe_archive_path_from_enclosed(file.enclosed_name(), is_directory)?;
        let uncompressed_size = archive_size_to_i64(file.size())?;
        let compressed_size = archive_size_to_i64(file.compressed_size())?;
        total_uncompressed = total_uncompressed
            .checked_add(uncompressed_size)
            .ok_or_else(|| archive_limit_problem("archive total uncompressed size overflow"))?;
        if total_uncompressed > ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES {
            return Err(archive_limit_problem(&format!(
                "archive total uncompressed size must be at most {ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES}"
            )));
        }
        items.push(ArchiveEntryResponse {
            name: safe_path
                .segments
                .last()
                .cloned()
                .unwrap_or_else(|| safe_path.path.clone()),
            path: safe_path.path.clone(),
            is_directory,
            uncompressed_size_bytes: uncompressed_size,
            compressed_size_bytes: compressed_size,
            content_type: (!is_directory)
                .then(|| guess_content_type_from_name(&safe_path.path).to_string()),
        });
    }
    Ok(items)
}

pub(crate) fn read_archive_files_for_extract(
    archive_bytes: &[u8],
    requested_paths: Option<&BTreeSet<String>>,
) -> Result<Vec<ArchiveFileForExtract>, (StatusCode, Json<ProblemDetail>)> {
    let mut archive = open_zip_archive(archive_bytes)?;
    validate_archive_entry_count(archive.len())?;
    let mut files = Vec::new();
    let mut total_uncompressed = 0_i64;
    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(map_zip_archive_error)?;
        let is_directory = file.is_dir();
        let safe_path = safe_archive_path_from_enclosed(file.enclosed_name(), is_directory)?;
        let uncompressed_size = archive_size_to_i64(file.size())?;
        total_uncompressed = total_uncompressed
            .checked_add(uncompressed_size)
            .ok_or_else(|| archive_limit_problem("archive total uncompressed size overflow"))?;
        if total_uncompressed > ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES {
            return Err(archive_limit_problem(&format!(
                "archive total uncompressed size must be at most {ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES}"
            )));
        }
        if is_directory {
            continue;
        }
        if requested_paths.is_some_and(|paths| !paths.contains(&safe_path.path)) {
            continue;
        }
        let mut content = Vec::with_capacity(uncompressed_size as usize);
        file.read_to_end(&mut content)
            .map_err(|error| internal_problem(format!("read zip archive entry failed: {error}")))?;
        files.push(ArchiveFileForExtract {
            content_type: guess_content_type_from_name(&safe_path.path).to_string(),
            checksum_sha256_hex: sha256_hex(&content),
            path: safe_path,
            content,
        });
    }
    Ok(files)
}

fn open_zip_archive(
    archive_bytes: &[u8],
) -> Result<ArchiveZipReader, (StatusCode, Json<ProblemDetail>)> {
    ZipArchive::new(Cursor::new(archive_bytes.to_vec())).map_err(map_zip_archive_error)
}

fn map_zip_archive_error(error: zip::result::ZipError) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        format!("ZIP archive cannot be inspected: {error}"),
        SdkWorkResultCode::ValidationError,
    )
}

fn validate_archive_entry_count(count: usize) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if count > ARCHIVE_MAX_ENTRIES {
        return Err(archive_limit_problem(&format!(
            "archive can include at most {ARCHIVE_MAX_ENTRIES} entries"
        )));
    }
    Ok(())
}

fn archive_limit_problem(detail: &str) -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        detail,
        SdkWorkResultCode::ValidationError,
    )
}

fn archive_size_to_i64(value: u64) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    if value > i64::MAX as u64 {
        return Err(archive_limit_problem(
            "archive entry size exceeds supported range",
        ));
    }
    Ok(value as i64)
}

fn safe_archive_path_from_enclosed(
    enclosed_name: Option<PathBuf>,
    is_directory: bool,
) -> Result<SafeArchivePath, (StatusCode, Json<ProblemDetail>)> {
    let Some(path) = enclosed_name else {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "ZIP archive contains an unsafe entry path",
            SdkWorkResultCode::ValidationError,
        ));
    };
    let mut segments = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(value) => {
                let raw = value.to_string_lossy();
                if raw.trim().is_empty() || raw == "." || raw == ".." {
                    return Err(unsafe_archive_path_problem());
                }
                segments.push(sanitize_archive_path_segment(&raw));
            }
            _ => return Err(unsafe_archive_path_problem()),
        }
    }
    if segments.is_empty() {
        return Err(unsafe_archive_path_problem());
    }
    let mut path = segments.join("/");
    if is_directory && !path.ends_with('/') {
        path.push('/');
    }
    Ok(SafeArchivePath { path, segments })
}

pub(crate) fn unsafe_archive_path_problem() -> (StatusCode, Json<ProblemDetail>) {
    problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "ZIP archive contains an unsafe entry path",
        SdkWorkResultCode::ValidationError,
    )
}

pub(crate) fn normalize_archive_entry_selection(
    entry_paths: Option<Vec<String>>,
) -> Result<Option<BTreeSet<String>>, (StatusCode, Json<ProblemDetail>)> {
    let Some(entry_paths) = entry_paths else {
        return Ok(None);
    };
    if entry_paths.is_empty() {
        return Ok(None);
    }
    let mut normalized = BTreeSet::new();
    for entry_path in entry_paths {
        let path = normalize_archive_entry_selection_path(&entry_path)?;
        normalized.insert(path);
    }
    Ok(Some(normalized))
}

fn normalize_archive_entry_selection_path(
    entry_path: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = entry_path.trim().replace('\\', "/");
    if trimmed.is_empty() || trimmed.starts_with('/') || trimmed.contains(':') {
        return Err(unsafe_archive_path_problem());
    }
    let mut segments = Vec::new();
    for segment in trimmed.split('/') {
        if segment.trim().is_empty() || segment == "." || segment == ".." {
            return Err(unsafe_archive_path_problem());
        }
        segments.push(sanitize_archive_path_segment(segment));
    }
    Ok(segments.join("/"))
}

fn guess_content_type_from_name(name: &str) -> &'static str {
    let extension = name
        .rsplit_once('.')
        .map(|(_, extension)| extension.to_ascii_lowercase())
        .unwrap_or_default();
    match extension.as_str() {
        "txt" => "text/plain",
        "md" => "text/markdown",
        "csv" => "text/csv",
        "html" | "htm" => "text/html",
        "json" => "application/json",
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "zip" => "application/zip",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        _ => "application/octet-stream",
    }
}

pub(crate) fn sanitize_archive_path_segment(raw: &str) -> String {
    let mut sanitized = raw
        .trim()
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            ch if ch.is_control() => '_',
            ch => ch,
        })
        .collect::<String>();
    while sanitized.starts_with('.') {
        sanitized.remove(0);
    }
    if sanitized.is_empty() {
        "unnamed".to_string()
    } else {
        sanitized
    }
}

pub(crate) fn sanitize_relative_archive_path(raw: &str) -> String {
    raw.split('/')
        .map(sanitize_archive_path_segment)
        .collect::<Vec<_>>()
        .join("/")
}

pub(crate) fn unique_archive_path(candidate: &str, used_paths: &mut BTreeSet<String>) -> String {
    let normalized = sanitize_relative_archive_path(candidate);
    if used_paths.insert(normalized.clone()) {
        return normalized;
    }
    let (stem, extension) = match normalized.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => (stem.to_string(), format!(".{extension}")),
        _ => (normalized.clone(), String::new()),
    };
    for index in 1..10_000 {
        let candidate = sdkwork_utils_rust::format_numbered_filename_variant(
            &stem,
            index,
            extension.strip_prefix('.').filter(|ext| !ext.is_empty()),
        );
        if used_paths.insert(candidate.clone()) {
            return candidate;
        }
    }
    normalized
}
