use crate::error::{validation_problem, ProblemDetail};
use axum::http::StatusCode;
use axum::Json;
use sdkwork_drive_product::DriveProductError;

pub(crate) fn decode_object_key(raw: &str) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let mut decoded = String::with_capacity(raw.len());
    let bytes = raw.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err(validation_problem("object key path encoding is invalid"));
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3])
                .map_err(|_| validation_problem("object key path encoding is invalid"))?;
            let value = u8::from_str_radix(hex, 16)
                .map_err(|_| validation_problem("object key path encoding is invalid"))?;
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
    let trimmed = require_non_empty_text(value, field_name)?;
    if trimmed.len() > 1024 {
        return Err(validation_problem(format!(
            "{field_name} must be at most 1024 UTF-8 bytes"
        )));
    }
    if trimmed.as_bytes().contains(&0) {
        return Err(validation_problem(format!(
            "{field_name} must not contain NUL bytes"
        )));
    }
    if trimmed.starts_with('/') || trimmed.ends_with('/') {
        return Err(validation_problem(format!(
            "{field_name} must not start or end with slash"
        )));
    }
    for segment in trimmed.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(validation_problem(format!(
                "{field_name} must not contain empty or period-only path segments"
            )));
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
        return Err(validation_problem(format!(
            "{field_name} must be at most 1024 UTF-8 bytes"
        )));
    }
    if trimmed.as_bytes().contains(&0) || trimmed.starts_with('/') {
        return Err(validation_problem(format!("{field_name} is invalid")));
    }
    for segment in trimmed.trim_end_matches('/').split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(validation_problem(format!(
                "{field_name} must not contain empty or period-only path segments"
            )));
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
        return Err(validation_problem(format!(
            "{field_name} must be '/' when provided"
        )));
    }
    Ok(Some(trimmed))
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
        return Err(validation_problem(format!(
            "{field_name} must be between {min_value} and {max_value}"
        )));
    }
    Ok(page_size)
}

pub(crate) fn validate_storage_binding_lifecycle_status(
    status: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(status, "active" | "disabled" | "deleted") {
        return Ok(());
    }
    Err(validation_problem("lifecycleStatus is invalid"))
}

pub(crate) fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_string())
        .filter(|trimmed| !trimmed.is_empty())
}

pub(crate) fn require_query_operator_id(
    value: Option<String>,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let Some(value) = value else {
        return Err(validation_problem("operatorId is required"));
    };
    require_non_empty_text(value, "operatorId")
}

pub(crate) fn require_non_empty_text(
    value: String,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(validation_problem(format!("{field_name} is required")));
    }
    Ok(trimmed)
}

pub(crate) fn require_tenant_id(tenant_id: Option<String>) -> Result<String, DriveProductError> {
    let tenant_id = tenant_id
        .ok_or_else(|| DriveProductError::Validation("tenant_id is required".to_string()))?
        .trim()
        .to_string();
    if tenant_id.is_empty() {
        return Err(DriveProductError::Validation(
            "tenant_id is required".to_string(),
        ));
    }
    Ok(tenant_id)
}

pub(crate) fn default_storage_provider_binding_id(
    tenant_id: &str,
    space_id: Option<&str>,
) -> String {
    match space_id {
        Some(space_id) => format!("default:space:{tenant_id}:{space_id}"),
        None => format!("default:tenant:{tenant_id}"),
    }
}

fn default_storage_root_prefix(tenant_id: &str, space_id: Option<&str>) -> String {
    match space_id {
        Some(space_id) => format!("sdkwork-drive/v1/tenants/{tenant_id}/spaces/{space_id}"),
        None => format!("sdkwork-drive/v1/tenants/{tenant_id}"),
    }
}

pub(crate) fn normalize_storage_root_prefix(
    value: Option<String>,
    tenant_id: &str,
    space_id: Option<&str>,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let prefix = normalize_optional_text(value)
        .unwrap_or_else(|| default_storage_root_prefix(tenant_id, space_id));
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
