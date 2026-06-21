use crate::dto::PageRequest;
use crate::error::{problem, ProblemDetail};
use crate::time::current_epoch_ms;
use axum::http::StatusCode;
use axum::Json;

pub(crate) fn require_query_value(
    value: Option<String>,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    require_body_value(value, field_name)
}

pub(crate) fn require_body_value(
    value: Option<String>,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let Some(raw) = value else {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} is required"),
            "drive.validation.failed",
        ));
    };
    let trimmed = raw.trim().to_string();
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

pub(crate) fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_string())
        .filter(|trimmed| !trimmed.is_empty())
}

pub(crate) fn parse_page_request(
    page_size: Option<i64>,
    page_token: Option<String>,
) -> Result<PageRequest, (StatusCode, Json<ProblemDetail>)> {
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
    Ok(PageRequest { limit, offset })
}

pub(crate) fn next_page_token<T>(items: &mut Vec<T>, page: PageRequest) -> Option<String> {
    if items.len() as i64 > page.limit {
        items.pop();
        Some((page.offset + page.limit).to_string())
    } else {
        None
    }
}

pub(crate) fn parse_change_page_request(
    page_size: Option<i64>,
    page_token: Option<String>,
    cursor: Option<i64>,
) -> Result<PageRequest, (StatusCode, Json<ProblemDetail>)> {
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
        None => cursor.unwrap_or(0),
    };
    if offset < 0 {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "pageToken is invalid",
            "drive.validation.failed",
        ));
    }
    Ok(PageRequest { limit, offset })
}

pub(crate) fn validate_permission_role(
    role: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(role, "reader" | "commenter" | "writer" | "owner") {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "permission role is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_share_link_role(
    role: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(role, "reader" | "commenter" | "writer") {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "share link role is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_optional_non_negative_i64(
    value: Option<i64>,
    field_name: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if value.is_some_and(|value| value < 0) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be greater than or equal to 0"),
            "drive.validation.failed",
        ));
    }
    Ok(())
}

pub(crate) fn validate_optional_future_epoch_ms(
    value: Option<i64>,
    field_name: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if value.is_some_and(|value| value <= current_epoch_ms()) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be in the future"),
            "drive.validation.failed",
        ));
    }
    Ok(())
}

pub(crate) fn validate_requested_ttl_seconds(
    value: Option<u32>,
    default_seconds: u32,
    min_seconds: u32,
    max_seconds: u32,
    field_name: &str,
) -> Result<u32, (StatusCode, Json<ProblemDetail>)> {
    let ttl_seconds = value.unwrap_or(default_seconds);
    if ttl_seconds < min_seconds || ttl_seconds > max_seconds {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be between {min_seconds} and {max_seconds} seconds"),
            "drive.validation.failed",
        ));
    }
    Ok(ttl_seconds)
}

pub(crate) fn validate_content_type<'a>(
    value: &'a str,
    field_name: &str,
) -> Result<&'a str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > 255 || trimmed != value {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be a trimmed MIME type up to 255 characters"),
            "drive.validation.failed",
        ));
    }
    let Some((type_part, subtype_part)) = trimmed.split_once('/') else {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be a valid MIME type"),
            "drive.validation.failed",
        ));
    };
    if !is_mime_token(type_part) || !is_mime_token(subtype_part) {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must be a valid MIME type"),
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

fn is_mime_token(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(
                    byte,
                    b'!' | b'#'
                        | b'$'
                        | b'%'
                        | b'&'
                        | b'\''
                        | b'*'
                        | b'+'
                        | b'-'
                        | b'.'
                        | b'^'
                        | b'_'
                        | b'`'
                        | b'|'
                        | b'~'
                )
        })
}

pub(crate) fn validate_sha256_checksum<'a>(
    value: &'a str,
    field_name: &str,
) -> Result<&'a str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = value.trim();
    let Some(hex) = trimmed.strip_prefix("sha256:") else {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must use sha256:<64 lowercase hex characters>"),
            "drive.validation.failed",
        ));
    };
    if trimmed != value
        || hex.len() != 64
        || !hex
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            format!("{field_name} must use sha256:<64 lowercase hex characters>"),
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
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

pub(crate) fn validate_object_key(
    value: String,
    field_name: &str,
) -> Result<String, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = require_non_empty_text(value, field_name)?;
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

pub(crate) fn validate_subject_type(
    subject_type: &str,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if matches!(subject_type, "user" | "group" | "domain" | "app") {
        return Ok(());
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "subjectType is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_node_property_key(
    property_key: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = property_key.trim();
    if trimmed.is_empty()
        || trimmed.len() > 128
        || !trimmed
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'-'))
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "propertyKey is invalid",
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn validate_node_property_visibility(
    visibility: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = visibility.trim();
    if matches!(trimmed, "private" | "app_public") {
        return Ok(trimmed);
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "visibility is invalid",
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

pub(crate) fn validate_watch_channel_id(
    channel_id: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = channel_id.trim();
    if trimmed.is_empty()
        || trimmed.len() > 64
        || !trimmed
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'-'))
    {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "id is invalid",
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn validate_watch_channel_address(
    address: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = address.trim();
    if trimmed.len() > 2048 || !trimmed.starts_with("https://") {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "address must be an https webhook URL",
            "drive.validation.failed",
        ));
    }
    Ok(trimmed)
}

pub(crate) fn validate_watch_channel_type(
    channel_type: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = channel_type.trim();
    if trimmed == "web_hook" {
        return Ok(trimmed);
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "channelType is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_watch_resource_type(
    resource_type: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = resource_type.trim();
    if matches!(trimmed, "changes" | "node") {
        return Ok(trimmed);
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "resourceType is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_watch_lifecycle_status(
    lifecycle_status: &str,
) -> Result<&str, (StatusCode, Json<ProblemDetail>)> {
    let trimmed = lifecycle_status.trim();
    if matches!(trimmed, "active" | "stopped" | "expired") {
        return Ok(trimmed);
    }
    Err(problem(
        StatusCode::BAD_REQUEST,
        "validation failed",
        "lifecycleStatus is invalid",
        "drive.validation.failed",
    ))
}

pub(crate) fn validate_watch_expiration(
    expiration_epoch_ms: i64,
) -> Result<(), (StatusCode, Json<ProblemDetail>)> {
    if expiration_epoch_ms <= current_epoch_ms() {
        return Err(problem(
            StatusCode::BAD_REQUEST,
            "validation failed",
            "expirationEpochMs must be in the future",
            "drive.validation.failed",
        ));
    }
    Ok(())
}
