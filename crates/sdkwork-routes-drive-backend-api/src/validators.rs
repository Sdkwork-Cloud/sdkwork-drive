use crate::dto::OffsetPage;
use crate::error::{problem, ProblemDetail};
use axum::http::StatusCode;
use axum::Json;

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
