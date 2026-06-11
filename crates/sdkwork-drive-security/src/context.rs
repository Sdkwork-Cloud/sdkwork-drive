use hmac::{Hmac, Mac};
use http::{HeaderMap, Uri};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::collections::BTreeMap;

type HmacSha256 = Hmac<Sha256>;

pub const AUTHORIZATION_HEADER: &str = "authorization";
pub const ACCESS_TOKEN_HEADER: &str = "access-token";
pub const TENANT_ID_HEADER: &str = "x-sdkwork-tenant-id";
pub const USER_ID_HEADER: &str = "x-sdkwork-user-id";
pub const ORGANIZATION_ID_HEADER: &str = "x-sdkwork-organization-id";
pub const SESSION_ID_HEADER: &str = "x-sdkwork-session-id";
pub const APP_ID_HEADER: &str = "x-sdkwork-app-id";
pub const ENVIRONMENT_HEADER: &str = "x-sdkwork-environment";
pub const DEPLOYMENT_MODE_HEADER: &str = "x-sdkwork-deployment-mode";
pub const AUTH_LEVEL_HEADER: &str = "x-sdkwork-auth-level";
pub const DATA_SCOPE_HEADER: &str = "x-sdkwork-data-scope";
pub const PERMISSION_SCOPE_HEADER: &str = "x-sdkwork-permission-scope";
pub const ACTOR_ID_HEADER: &str = "x-sdkwork-actor-id";
pub const ACTOR_KIND_HEADER: &str = "x-sdkwork-actor-kind";
pub const DEVICE_ID_HEADER: &str = "x-sdkwork-device-id";
pub const CONTEXT_SIGNATURE_HEADER: &str = "x-sdkwork-context-signature";
pub const REQUEST_ID_HEADER: &str = "x-request-id";
pub const TRACE_ID_HEADER: &str = "x-trace-id";

const CONTEXT_HEADERS_FOR_SIGNATURE: [&str; 13] = [
    TENANT_ID_HEADER,
    USER_ID_HEADER,
    ORGANIZATION_ID_HEADER,
    SESSION_ID_HEADER,
    APP_ID_HEADER,
    ENVIRONMENT_HEADER,
    DEPLOYMENT_MODE_HEADER,
    AUTH_LEVEL_HEADER,
    DATA_SCOPE_HEADER,
    PERMISSION_SCOPE_HEADER,
    ACTOR_ID_HEADER,
    ACTOR_KIND_HEADER,
    DEVICE_ID_HEADER,
];

pub fn crate_id() -> &'static str {
    "sdkwork-drive-security"
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveAppContext {
    pub tenant_id: String,
    pub user_id: String,
    pub organization_id: Option<String>,
    pub session_id: Option<String>,
    pub app_id: Option<String>,
    pub environment: Option<String>,
    pub deployment_mode: Option<String>,
    pub auth_level: Option<String>,
    pub data_scope: Vec<String>,
    pub permission_scope: Vec<String>,
    pub actor_id: String,
    pub actor_kind: String,
    pub device_id: Option<String>,
    pub request_id: String,
    pub trace_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DriveContextSignaturePolicy {
    AllowUnsigned,
    VerifyWhenPresent,
    RequireSigned { secret: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveAuthValidationPolicy {
    pub signature_policy: DriveContextSignaturePolicy,
}

impl DriveAuthValidationPolicy {
    pub fn allow_unsigned_for_development() -> Self {
        Self {
            signature_policy: DriveContextSignaturePolicy::VerifyWhenPresent,
        }
    }

    pub fn require_signed_projection(secret: impl Into<String>) -> Self {
        Self {
            signature_policy: DriveContextSignaturePolicy::RequireSigned {
                secret: secret.into(),
            },
        }
    }
}

impl Default for DriveAuthValidationPolicy {
    fn default() -> Self {
        Self::allow_unsigned_for_development()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveAuthError {
    pub status: u16,
    pub title: &'static str,
    pub detail: String,
    pub code: &'static str,
    pub request_id: String,
    pub trace_id: String,
}

pub fn validate_drive_app_context(
    headers: &HeaderMap,
    uri: &Uri,
    policy: &DriveAuthValidationPolicy,
) -> Result<DriveAppContext, DriveAuthError> {
    let request_id =
        optional_header(headers, REQUEST_ID_HEADER).unwrap_or_else(|| "request-unset".to_string());
    let trace_id =
        optional_header(headers, TRACE_ID_HEADER).unwrap_or_else(|| "trace-unset".to_string());

    let auth_token = bearer_token(headers, &request_id, &trace_id)?;
    if auth_token.is_empty() {
        return Err(auth_error(
            401,
            "unauthorized",
            "Authorization bearer token is required",
            "sdkwork.auth.missing_auth_token",
            &request_id,
            &trace_id,
        ));
    }

    let access_token = required_header(
        headers,
        ACCESS_TOKEN_HEADER,
        "Access-Token header is required",
        "sdkwork.auth.missing_access_token",
        &request_id,
        &trace_id,
    )?;
    if access_token.trim().is_empty() {
        return Err(auth_error(
            401,
            "unauthorized",
            "Access-Token header is required",
            "sdkwork.auth.missing_access_token",
            &request_id,
            &trace_id,
        ));
    }

    validate_context_signature(headers, policy, &request_id, &trace_id)?;

    let tenant_id = required_header(
        headers,
        TENANT_ID_HEADER,
        "SDKWork tenant context header is required",
        "sdkwork.auth.missing_app_context",
        &request_id,
        &trace_id,
    )?;
    let user_id = required_header(
        headers,
        USER_ID_HEADER,
        "SDKWork user context header is required",
        "sdkwork.auth.missing_app_context",
        &request_id,
        &trace_id,
    )?;
    let actor_id = optional_header(headers, ACTOR_ID_HEADER).unwrap_or_else(|| user_id.clone());
    let actor_kind =
        optional_header(headers, ACTOR_KIND_HEADER).unwrap_or_else(|| "user".to_string());

    let context = DriveAppContext {
        tenant_id,
        user_id,
        organization_id: optional_header(headers, ORGANIZATION_ID_HEADER),
        session_id: optional_header(headers, SESSION_ID_HEADER),
        app_id: optional_header(headers, APP_ID_HEADER),
        environment: optional_header(headers, ENVIRONMENT_HEADER),
        deployment_mode: optional_header(headers, DEPLOYMENT_MODE_HEADER),
        auth_level: optional_header(headers, AUTH_LEVEL_HEADER),
        data_scope: split_scope_header(headers, DATA_SCOPE_HEADER),
        permission_scope: split_scope_header(headers, PERMISSION_SCOPE_HEADER),
        actor_id,
        actor_kind,
        device_id: optional_header(headers, DEVICE_ID_HEADER),
        request_id,
        trace_id,
    };

    validate_uri_context(uri, &context)?;
    Ok(context)
}

pub fn validate_json_context_projection(
    body: &Value,
    context: &DriveAppContext,
) -> Result<(), DriveAuthError> {
    let Some(object) = body.as_object() else {
        return Ok(());
    };
    if let Some(value) = first_string_field(object, &["tenantId", "tenant_id"]) {
        validate_tenant_match(value, context)?;
    }
    if let Some(value) = first_string_field(object, &["operatorId", "operator_id"]) {
        validate_operator_match(value, context)?;
    }
    Ok(())
}

pub fn sign_context_headers(headers: &HeaderMap, secret: &str) -> Result<String, DriveAuthError> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| DriveAuthError {
        status: 500,
        title: "internal error",
        detail: "invalid context signature secret".to_string(),
        code: "sdkwork.auth.invalid_signature_secret",
        request_id: "request-unset".to_string(),
        trace_id: "trace-unset".to_string(),
    })?;
    mac.update(canonical_context_payload(headers).as_bytes());
    Ok(hex_encode(&mac.finalize().into_bytes()))
}

fn validate_context_signature(
    headers: &HeaderMap,
    policy: &DriveAuthValidationPolicy,
    request_id: &str,
    trace_id: &str,
) -> Result<(), DriveAuthError> {
    let provided = optional_header(headers, CONTEXT_SIGNATURE_HEADER);
    match &policy.signature_policy {
        DriveContextSignaturePolicy::AllowUnsigned => Ok(()),
        DriveContextSignaturePolicy::VerifyWhenPresent => {
            if let Some(provided) = provided {
                verify_signature(headers, &provided, "", request_id, trace_id)
            } else {
                Ok(())
            }
        }
        DriveContextSignaturePolicy::RequireSigned { secret } => {
            let Some(provided) = provided else {
                return Err(auth_error(
                    401,
                    "unauthorized",
                    "signed SDKWork context projection is required",
                    "sdkwork.auth.missing_context_signature",
                    request_id,
                    trace_id,
                ));
            };
            verify_signature(headers, &provided, secret, request_id, trace_id)
        }
    }
}

fn verify_signature(
    headers: &HeaderMap,
    provided: &str,
    secret: &str,
    request_id: &str,
    trace_id: &str,
) -> Result<(), DriveAuthError> {
    if secret.is_empty() {
        return Err(auth_error(
            401,
            "unauthorized",
            "context signature verification secret is not configured",
            "sdkwork.auth.context_signature_unverifiable",
            request_id,
            trace_id,
        ));
    }
    let expected = sign_context_headers(headers, secret).map_err(|_| {
        auth_error(
            500,
            "internal error",
            "context signature verification failed",
            "sdkwork.auth.context_signature_error",
            request_id,
            trace_id,
        )
    })?;
    let provided = provided.strip_prefix("sha256=").unwrap_or(provided).trim();
    if !expected.eq_ignore_ascii_case(provided) {
        return Err(auth_error(
            401,
            "unauthorized",
            "SDKWork context projection signature is invalid",
            "sdkwork.auth.invalid_context_signature",
            request_id,
            trace_id,
        ));
    }
    Ok(())
}

fn canonical_context_payload(headers: &HeaderMap) -> String {
    let mut values = BTreeMap::new();
    for header_name in CONTEXT_HEADERS_FOR_SIGNATURE {
        if let Some(value) = optional_header(headers, header_name) {
            values.insert(header_name, value);
        }
    }
    values
        .into_iter()
        .map(|(key, value)| format!("{key}={value}\n"))
        .collect()
}

fn validate_uri_context(uri: &Uri, context: &DriveAppContext) -> Result<(), DriveAuthError> {
    let Some(query) = uri.query() else {
        return Ok(());
    };
    let query = parse_query(query);
    if let Some(value) = first_query_value(&query, &["tenantId", "tenant_id"]) {
        validate_tenant_match(value, context)?;
    }
    if let Some(value) = first_query_value(&query, &["operatorId", "operator_id"]) {
        validate_operator_match(value, context)?;
    }
    Ok(())
}

fn validate_tenant_match(value: &str, context: &DriveAppContext) -> Result<(), DriveAuthError> {
    if value.trim() == context.tenant_id {
        return Ok(());
    }
    Err(context_conflict(
        "request tenant does not match verified SDKWork AppContext tenant",
        context,
    ))
}

fn validate_operator_match(value: &str, context: &DriveAppContext) -> Result<(), DriveAuthError> {
    if value.trim() == context.actor_id {
        return Ok(());
    }
    Err(context_conflict(
        "request operator does not match verified SDKWork AppContext actor",
        context,
    ))
}

fn context_conflict(detail: impl Into<String>, context: &DriveAppContext) -> DriveAuthError {
    DriveAuthError {
        status: 403,
        title: "forbidden",
        detail: detail.into(),
        code: "sdkwork.auth.context_conflict",
        request_id: context.request_id.clone(),
        trace_id: context.trace_id.clone(),
    }
}

fn bearer_token(
    headers: &HeaderMap,
    request_id: &str,
    trace_id: &str,
) -> Result<String, DriveAuthError> {
    let Some(value) = optional_header(headers, AUTHORIZATION_HEADER) else {
        return Err(auth_error(
            401,
            "unauthorized",
            "Authorization bearer token is required",
            "sdkwork.auth.missing_auth_token",
            request_id,
            trace_id,
        ));
    };
    let Some(token) = value.strip_prefix("Bearer ") else {
        return Err(auth_error(
            401,
            "unauthorized",
            "Authorization header must use Bearer token transport",
            "sdkwork.auth.invalid_auth_token",
            request_id,
            trace_id,
        ));
    };
    Ok(token.trim().to_string())
}

fn required_header(
    headers: &HeaderMap,
    name: &str,
    detail: &str,
    code: &'static str,
    request_id: &str,
    trace_id: &str,
) -> Result<String, DriveAuthError> {
    let Some(value) = optional_header(headers, name) else {
        return Err(auth_error(
            401,
            "unauthorized",
            detail.to_string(),
            code,
            request_id,
            trace_id,
        ));
    };
    if value.trim().is_empty() {
        return Err(auth_error(
            401,
            "unauthorized",
            detail.to_string(),
            code,
            request_id,
            trace_id,
        ));
    }
    Ok(value)
}

fn optional_header(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn split_scope_header(headers: &HeaderMap, name: &str) -> Vec<String> {
    optional_header(headers, name)
        .map(|value| {
            value
                .split([',', ' '])
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn first_string_field<'a>(
    object: &'a serde_json::Map<String, Value>,
    names: &[&str],
) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| object.get(*name).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn first_query_value<'a>(query: &'a BTreeMap<String, String>, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| query.get(*name).map(String::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn parse_query(query: &str) -> BTreeMap<String, String> {
    let mut values = BTreeMap::new();
    for pair in query.split('&') {
        if pair.is_empty() {
            continue;
        }
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        values.insert(percent_decode(key), percent_decode(value));
    }
    values
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let (Some(high), Some(low)) =
                    (hex_value(bytes[index + 1]), hex_value(bytes[index + 2]))
                {
                    decoded.push((high << 4) | low);
                    index += 3;
                } else {
                    decoded.push(bytes[index]);
                    index += 1;
                }
            }
            current => {
                decoded.push(current);
                index += 1;
            }
        }
    }
    String::from_utf8_lossy(&decoded).to_string()
}

fn hex_value(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut encoded = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        encoded.push(HEX[(byte >> 4) as usize] as char);
        encoded.push(HEX[(byte & 0x0f) as usize] as char);
    }
    encoded
}

fn auth_error(
    status: u16,
    title: &'static str,
    detail: impl Into<String>,
    code: &'static str,
    request_id: &str,
    trace_id: &str,
) -> DriveAuthError {
    DriveAuthError {
        status,
        title,
        detail: detail.into(),
        code,
        request_id: request_id.to_string(),
        trace_id: trace_id.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::HeaderValue;

    #[test]
    fn validates_dual_tokens_and_context_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION_HEADER,
            HeaderValue::from_static("Bearer auth"),
        );
        headers.insert(ACCESS_TOKEN_HEADER, HeaderValue::from_static("access"));
        headers.insert(TENANT_ID_HEADER, HeaderValue::from_static("tenant-001"));
        headers.insert(USER_ID_HEADER, HeaderValue::from_static("user-001"));

        let context = validate_drive_app_context(
            &headers,
            &"/app/v3/api/drive/spaces?tenantId=tenant-001"
                .parse()
                .expect("uri"),
            &DriveAuthValidationPolicy::default(),
        )
        .expect("context should validate");

        assert_eq!(context.tenant_id, "tenant-001");
        assert_eq!(context.user_id, "user-001");
        assert_eq!(context.actor_id, "user-001");
    }

    #[test]
    fn rejects_query_tenant_conflicts() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION_HEADER,
            HeaderValue::from_static("Bearer auth"),
        );
        headers.insert(ACCESS_TOKEN_HEADER, HeaderValue::from_static("access"));
        headers.insert(TENANT_ID_HEADER, HeaderValue::from_static("tenant-001"));
        headers.insert(USER_ID_HEADER, HeaderValue::from_static("user-001"));

        let error = validate_drive_app_context(
            &headers,
            &"/app/v3/api/drive/spaces?tenantId=tenant-002"
                .parse()
                .expect("uri"),
            &DriveAuthValidationPolicy::default(),
        )
        .expect_err("tenant conflict should fail");

        assert_eq!(error.status, 403);
        assert_eq!(error.code, "sdkwork.auth.context_conflict");
    }

    #[test]
    fn rejects_invalid_required_signature() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION_HEADER,
            HeaderValue::from_static("Bearer auth"),
        );
        headers.insert(ACCESS_TOKEN_HEADER, HeaderValue::from_static("access"));
        headers.insert(TENANT_ID_HEADER, HeaderValue::from_static("tenant-001"));
        headers.insert(USER_ID_HEADER, HeaderValue::from_static("user-001"));
        headers.insert(
            CONTEXT_SIGNATURE_HEADER,
            HeaderValue::from_static("sha256=invalid"),
        );

        let error = validate_drive_app_context(
            &headers,
            &"/app/v3/api/drive/spaces".parse().expect("uri"),
            &DriveAuthValidationPolicy::require_signed_projection("secret"),
        )
        .expect_err("invalid signature should fail");

        assert_eq!(error.status, 401);
        assert_eq!(error.code, "sdkwork.auth.invalid_context_signature");
    }

    #[test]
    fn rejects_signed_context_when_device_id_is_changed_after_signing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION_HEADER,
            HeaderValue::from_static("Bearer auth"),
        );
        headers.insert(ACCESS_TOKEN_HEADER, HeaderValue::from_static("access"));
        headers.insert(TENANT_ID_HEADER, HeaderValue::from_static("tenant-001"));
        headers.insert(USER_ID_HEADER, HeaderValue::from_static("user-001"));
        headers.insert(
            DEVICE_ID_HEADER,
            HeaderValue::from_static("device-original"),
        );
        let signature = sign_context_headers(&headers, "secret").expect("signature");
        headers.insert(
            CONTEXT_SIGNATURE_HEADER,
            HeaderValue::from_str(&format!("sha256={signature}")).expect("signature header"),
        );
        headers.insert(
            DEVICE_ID_HEADER,
            HeaderValue::from_static("device-tampered"),
        );

        let error = validate_drive_app_context(
            &headers,
            &"/app/v3/api/drive/spaces".parse().expect("uri"),
            &DriveAuthValidationPolicy::require_signed_projection("secret"),
        )
        .expect_err("device id tampering should fail");

        assert_eq!(error.status, 401);
        assert_eq!(error.code, "sdkwork.auth.invalid_context_signature");
    }
}
