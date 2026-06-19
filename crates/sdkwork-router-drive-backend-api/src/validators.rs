use crate::dto::OffsetPage;
use crate::error::{problem, validation_problem, ProblemDetail};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_workspace_service::domain::storage_provider::DriveStorageProviderKind;
use sdkwork_drive_workspace_service::DriveServiceError;

pub(crate) fn decode_object_key(raw: &str) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let mut decoded = String::with_capacity(raw.len());
    let bytes = raw.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err(problem(
                    StatusCode::BAD_REQUEST,
                    "validation failed",
                    "object key path encoding is invalid",
                    "drive.validation.failed",
                ));
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).map_err(|_| {
                problem(
                    StatusCode::BAD_REQUEST,
                    "validation failed",
                    "object key path encoding is invalid",
                    "drive.validation.failed",
                )
            })?;
            let value = u8::from_str_radix(hex, 16).map_err(|_| {
                problem(
                    StatusCode::BAD_REQUEST,
                    "validation failed",
                    "object key path encoding is invalid",
                    "drive.validation.failed",
                )
            })?;
            decoded.push(char::from(value));
            index += 3;
        } else {
            decoded.push(char::from(bytes[index]));
            index += 1;
        }
    }
    validate_object_key(decoded, "objectKey")
}

pub(crate) fn validate_object_key(
    value: String,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = require_non_empty(value, field_name)?;
    if trimmed.len() > 1024 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be at most 1024 UTF-8 bytes"),
            "drive.validation.failed",
        ));
    }
    if trimmed.as_bytes().contains(&0) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must not contain NUL bytes"),
            "drive.validation.failed",
        ));
    }
    if trimmed.starts_with('/') || trimmed.ends_with('/') {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must not start or end with slash"),
            "drive.validation.failed",
        ));
    }
    for segment in trimmed.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                format!("{field_name} must not contain empty or period-only path segments"),
                "drive.validation.failed",
            ));
        }
    }
    Ok(trimmed)
}

pub(crate) fn validate_object_prefix(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<String>, (StatusCode, Json<ProblemDetail>)> {
    let Some(trimmed) = normalize_optional_text(value) else {
        return Ok(None);
    };
    if trimmed.len() > 1024 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be at most 1024 UTF-8 bytes"),
            "drive.validation.failed",
        ));
    }
    if trimmed.as_bytes().contains(&0) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must not contain NUL bytes"),
            "drive.validation.failed",
        ));
    }
    if trimmed.starts_with('/') {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must not start with slash"),
            "drive.validation.failed",
        ));
    }
    for segment in trimmed.trim_end_matches('/').split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                format!("{field_name} must not contain empty or period-only path segments"),
                "drive.validation.failed",
            ));
        }
    }
    Ok(Some(trimmed))
}

pub(crate) fn validate_object_delimiter(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<String>, (StatusCode, Json<ProblemDetail>)> {
    let Some(trimmed) = normalize_optional_text(value) else {
        return Ok(None);
    };
    if trimmed != "/" {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be '/' when provided"),
            "drive.validation.failed",
        ));
    }
    Ok(Some(trimmed))
}

pub(crate) fn require_non_empty(
    value: String,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} is required"),
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_string())
        .filter(|trimmed| !trimmed.is_empty())
}

pub(crate) fn require_non_empty_text(
    value: String,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} is required"),
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn parse_offset_page(
    page_size: Option<i64>,
    page_token: Option<String>,
) -> Result<OffsetPage, (StatusCode, Json<ProblemDetail>)> {
    let limit = validate_page_size_i64(page_size, 200, 1, 200, "pageSize")?;
    let offset = match normalize_optional_text(page_token) {
        Some(raw) => raw.parse::<i64>().map_err(|_| {
            problem(
                StatusCode::BAD_REQUEST,
                "validation failed",
                "pageToken is invalid",
                "drive.validation.failed",
            )
        })?,
        None => 0,
    };
    if offset < 0 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "pageToken is invalid",
            "drive.validation.failed",
        ));
    }
    Ok(OffsetPage { limit, offset })
}

pub(crate) fn validate_page_size_u16(
    value: Option<u16>,
    default_value: u16,
    min_value: u16,
    max_value: u16,
    field_name: &str,
) -> Result<u16, (StatusCode, Json<ProblemDetail>)> {
    let page_size = value.unwrap_or(default_value);
    if page_size < min_value || page_size > max_value {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be between {min_value} and {max_value}"),
            "drive.validation.failed",
        ));
    }
    Ok(page_size)
}

pub(crate) fn validate_page_size_i64(
    value: Option<i64>,
    default_value: i64,
    min_value: i64,
    max_value: i64,
    field_name: &str,
) -> Result<i64, (StatusCode, Json<ProblemDetail>)> {
    let page_size = value.unwrap_or(default_value);
    if page_size < min_value || page_size > max_value {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be between {min_value} and {max_value}"),
            "drive.validation.failed",
        ));
    }
    Ok(page_size)
}

pub(crate) fn validate_page_u32(
    value: Option<u32>,
    default_value: u32,
    min_value: u32,
    max_value: u32,
    field_name: &str,
) -> Result<u32, (StatusCode, Json<ProblemDetail>)> {
    let page = value.unwrap_or(default_value);
    if page < min_value || page > max_value {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be between {min_value} and {max_value}"),
            "drive.validation.failed",
        ));
    }
    Ok(page)
}

pub(crate) fn validate_page_size_u32(
    value: Option<u32>,
    default_value: u32,
    min_value: u32,
    max_value: u32,
    field_name: &str,
) -> Result<u32, (StatusCode, Json<ProblemDetail>)> {
    let page_size = value.unwrap_or(default_value);
    if page_size < min_value || page_size > max_value {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be between {min_value} and {max_value}"),
            "drive.validation.failed",
        ));
    }
    Ok(page_size)
}

pub(crate) fn next_page_token<T>(items: &mut Vec<T>, page: OffsetPage) -> Option<String> {
    if items.len() as i64 > page.limit {
        items.pop();
        Some((page.offset + page.limit).to_string())
    } else {
        None
    }
}

pub(crate) fn validate_lifecycle_status(
    status: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(status, "active" | "deleted") {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "lifecycleStatus is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_download_package_state(
    state: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(state, "creating" | "ready" | "failed" | "expired") {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "state is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_label_key(
    label_key: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = label_key.trim();
    if trimmed.is_empty()
        || trimmed.len() > 128
        || !trimmed
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'-'))
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "labelKey is invalid",
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn validate_label_color(color: &str) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = color.trim();
    let bytes = trimmed.as_bytes();
    if bytes.len() == 7
        && bytes[0] == b'#'
        && bytes[1..].iter().all(|byte| byte.is_ascii_hexdigit())
    {
        return Ok(trimmed);
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "color is invalid",
        "drive.validation.failed",
    ))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum StorageProviderBindingTarget {
    Tenant,
    Space(String),
    SpaceType(String),
}

pub(crate) fn resolve_storage_provider_binding_target(
    space_id: Option<String>,
    space_type: Option<String>,
) -> Result<StorageProviderBindingTarget, (StatusCode, Json<ProblemDetail>)> {
    let space_id = normalize_optional_text(space_id);
    let space_type = normalize_optional_text(space_type);
    if space_id.is_some() && space_type.is_some() {
        return Err(validation_problem(
            "spaceId and spaceType are mutually exclusive",
        ));
    }
    if let Some(space_id) = space_id {
        return Ok(StorageProviderBindingTarget::Space(space_id));
    }
    if let Some(space_type) = space_type {
        validate_storage_binding_space_type(&space_type)?;
        return Ok(StorageProviderBindingTarget::SpaceType(space_type));
    }
    Ok(StorageProviderBindingTarget::Tenant)
}

pub(crate) fn validate_storage_binding_space_type(
    space_type: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    match space_type {
        "personal" | "team" | "knowledge_base" | "ai_generated" | "git_repository"
        | "deployment" | "app_upload" | "im" | "rtc" | "notary" => Ok(()),
        _ => Err(validation_problem("spaceType is invalid")),
    }
}

pub(crate) fn default_storage_provider_binding_id(
    tenant_id: &str,
    target: &StorageProviderBindingTarget,
) -> String {
    match target {
        StorageProviderBindingTarget::Tenant => format!("default:tenant:{tenant_id}"),
        StorageProviderBindingTarget::Space(space_id) => {
            format!("default:space:{tenant_id}:{space_id}")
        }
        StorageProviderBindingTarget::SpaceType(space_type) => {
            format!("default:space_type:{tenant_id}:{space_type}")
        }
    }
}

pub(crate) fn storage_provider_binding_scope(
    target: &StorageProviderBindingTarget,
) -> &'static str {
    match target {
        StorageProviderBindingTarget::Tenant => "tenant",
        StorageProviderBindingTarget::Space(_) => "space",
        StorageProviderBindingTarget::SpaceType(_) => "space_type",
    }
}

pub(crate) fn storage_provider_binding_purpose(target: &StorageProviderBindingTarget) -> String {
    match target {
        StorageProviderBindingTarget::Tenant | StorageProviderBindingTarget::Space(_) => {
            "primary".to_string()
        }
        StorageProviderBindingTarget::SpaceType(space_type) => space_type.clone(),
    }
}

fn default_storage_root_prefix(tenant_id: &str, target: &StorageProviderBindingTarget) -> String {
    match target {
        StorageProviderBindingTarget::Tenant => {
            format!("sdkwork-drive/v1/tenants/{tenant_id}")
        }
        StorageProviderBindingTarget::Space(space_id) => {
            format!("sdkwork-drive/v1/tenants/{tenant_id}/spaces/{space_id}")
        }
        StorageProviderBindingTarget::SpaceType(space_type) => {
            format!("sdkwork-drive/v1/tenants/{tenant_id}/space-types/{space_type}")
        }
    }
}

pub(crate) fn normalize_storage_root_prefix(
    value: Option<String>,
    tenant_id: &str,
    target: &StorageProviderBindingTarget,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let prefix = normalize_optional_text(value)
        .unwrap_or_else(|| default_storage_root_prefix(tenant_id, target));
    let prefix = validate_object_prefix(Some(prefix), "storageRootPrefix")?
        .ok_or_else(|| validation_problem("storageRootPrefix is required"))?;
    if prefix.len() > 512 {
        return Err(validation_problem(
            "storageRootPrefix must be at most 512 UTF-8 bytes",
        ));
    }
    if prefix.ends_with('/') {
        return Err(validation_problem(
            "storageRootPrefix must not end with slash",
        ));
    }
    Ok(prefix)
}

pub(crate) fn parse_storage_provider_kind(
    raw: &str,
) -> Result<DriveStorageProviderKind, DriveServiceError> {
    DriveStorageProviderKind::try_from_str(raw).ok_or_else(|| {
        DriveServiceError::Validation(
            "provider_kind is invalid; allowed: local_filesystem, s3_compatible, google_cloud_storage, aliyun_oss, tencent_cos, huawei_obs, volcengine_tos, or custom:<vendor_key>"
                .to_string(),
        )
    })
}
