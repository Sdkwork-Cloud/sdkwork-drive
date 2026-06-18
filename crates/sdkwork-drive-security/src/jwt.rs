use crate::policy::DriveAuthValidationPolicy;
use crate::token_claims::{decode_base64url, parse_json_claims, TokenClaimsError};
use hmac::{Hmac, Mac};
use jsonwebtoken::{decode, Algorithm, Validation};
use serde_json::Value;
use sha2::Sha256;
use std::collections::BTreeMap;

type HmacSha256 = Hmac<Sha256>;

pub fn is_jwt_format(raw: &str) -> bool {
    if raw.contains('=') || raw.starts_with('{') {
        return false;
    }
    let mut parts = raw.split('.');
    let header = parts.next().unwrap_or_default();
    let payload = parts.next().unwrap_or_default();
    let signature = parts.next().unwrap_or_default();
    !header.is_empty() && !payload.is_empty() && !signature.is_empty() && parts.next().is_none()
}

pub fn verify_jwt_hmac_claims(
    raw: &str,
    policy: &DriveAuthValidationPolicy,
) -> Result<BTreeMap<String, String>, TokenClaimsError> {
    let raw = raw.trim();
    let mut parts = raw.split('.');
    let header_b64 = parts.next().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT header segment is required".to_string())
    })?;
    let payload_b64 = parts.next().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT payload segment is required".to_string())
    })?;
    let signature_b64 = parts.next().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT signature segment is required".to_string())
    })?;
    if parts.next().is_some() {
        return Err(TokenClaimsError::InvalidCredentials(
            "JWT must contain exactly three segments".to_string(),
        ));
    }

    let kid = jwt_header_kid(header_b64);
    let secret = policy
        .resolve_jwt_hmac_secret(kid.as_deref())
        .ok_or_else(|| {
            TokenClaimsError::InvalidCredentials(
                "JWT signing key id is not configured for Drive auth".to_string(),
            )
        })?;

    let signing_input = format!("{header_b64}.{payload_b64}");
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| {
        TokenClaimsError::InvalidCredentials("JWT HMAC secret is invalid".to_string())
    })?;
    mac.update(signing_input.as_bytes());
    let expected = mac.finalize().into_bytes();
    let actual = decode_base64url(signature_b64).ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT signature is not valid base64url".to_string())
    })?;
    if actual.len() != expected.len() || !constant_time_eq(&actual, expected.as_slice()) {
        return Err(TokenClaimsError::InvalidCredentials(
            "JWT signature verification failed".to_string(),
        ));
    }

    let payload_bytes = decode_base64url(payload_b64).ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT payload is not valid base64url".to_string())
    })?;
    let payload = std::str::from_utf8(&payload_bytes).map_err(|error| {
        TokenClaimsError::InvalidCredentials(format!("JWT payload must be UTF-8: {error}"))
    })?;
    let claims = parse_json_claims(payload)?;
    validate_jwt_expiry(&claims)?;
    Ok(claims)
}

pub fn verify_jwt_jwks_claims(
    raw: &str,
    policy: &DriveAuthValidationPolicy,
) -> Result<BTreeMap<String, String>, TokenClaimsError> {
    let raw = raw.trim();
    let mut parts = raw.split('.');
    let header_b64 = parts.next().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT header segment is required".to_string())
    })?;
    let _payload_b64 = parts.next().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT payload segment is required".to_string())
    })?;
    if parts.next().is_some() {
        return Err(TokenClaimsError::InvalidCredentials(
            "JWT must contain exactly three segments".to_string(),
        ));
    }

    let alg = jwt_header_alg(header_b64).ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT alg header is required".to_string())
    })?;
    if alg != "RS256" {
        return Err(TokenClaimsError::InvalidCredentials(format!(
            "unsupported JWT alg for JWKS verification: {alg}"
        )));
    }

    let kid = jwt_header_kid(header_b64);
    let decoding_key = policy.resolve_jwt_jwks_key(kid.as_deref()).ok_or_else(|| {
        TokenClaimsError::InvalidCredentials(
            "JWT signing key id is not configured in Drive JWKS".to_string(),
        )
    })?;

    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_exp = false;
    let token_data = decode::<Value>(raw, decoding_key, &validation).map_err(|error| {
        TokenClaimsError::InvalidCredentials(format!("JWT signature verification failed: {error}"))
    })?;
    let claims = json_value_to_claim_map(&token_data.claims)?;
    validate_jwt_expiry(&claims)?;
    Ok(claims)
}

pub fn jwt_header_alg(header_b64: &str) -> Option<String> {
    let decoded = decode_base64url(header_b64)?;
    let decoded = std::str::from_utf8(&decoded).ok()?;
    let value = serde_json::from_str::<Value>(decoded).ok()?;
    value
        .get("alg")
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

fn json_value_to_claim_map(value: &Value) -> Result<BTreeMap<String, String>, TokenClaimsError> {
    let object = value.as_object().ok_or_else(|| {
        TokenClaimsError::InvalidCredentials("JWT payload must be a JSON object".to_string())
    })?;
    let mut claims = BTreeMap::new();
    for (key, value) in object {
        let normalized = match value {
            Value::String(text) => text.clone(),
            Value::Number(number) => number.to_string(),
            Value::Bool(flag) => flag.to_string(),
            Value::Null => continue,
            _ => serde_json::to_string(value).map_err(|error| {
                TokenClaimsError::InvalidCredentials(format!(
                    "JWT claim {key} could not be normalized: {error}"
                ))
            })?,
        };
        if !normalized.is_empty() {
            claims.insert(key.clone(), normalized);
        }
    }
    Ok(claims)
}

fn jwt_header_kid(header_b64: &str) -> Option<String> {
    let decoded = decode_base64url(header_b64)?;
    let decoded = std::str::from_utf8(&decoded).ok()?;
    let value = serde_json::from_str::<Value>(decoded).ok()?;
    value
        .get("kid")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn validate_jwt_expiry(claims: &BTreeMap<String, String>) -> Result<(), TokenClaimsError> {
    let Some(exp) = claims.get("exp") else {
        return Ok(());
    };
    let exp = exp.trim().parse::<i64>().map_err(|error| {
        TokenClaimsError::InvalidCredentials(format!("invalid exp claim: {error}"))
    })?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| {
            TokenClaimsError::InvalidCredentials(format!("system clock error: {error}"))
        })?
        .as_secs() as i64;
    if exp <= now {
        return Err(TokenClaimsError::InvalidCredentials(
            "JWT exp claim is in the past".to_string(),
        ));
    }
    Ok(())
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    let mut diff = 0u8;
    for (left_byte, right_byte) in left.iter().zip(right.iter()) {
        diff |= left_byte ^ right_byte;
    }
    diff == 0
}

#[cfg(test)]
pub fn encode_test_jwt_hmac(payload_json: &str, secret: &str) -> String {
    encode_test_jwt_hmac_with_kid(payload_json, secret, None)
}

#[cfg(test)]
pub fn encode_test_jwt_hmac_with_kid(
    payload_json: &str,
    secret: &str,
    kid: Option<&str>,
) -> String {
    let header = match kid {
        Some(kid) => encode_base64url(&format!(r#"{{"alg":"HS256","typ":"JWT","kid":"{kid}"}}"#)),
        None => encode_base64url(r#"{"alg":"HS256","typ":"JWT"}"#),
    };
    let payload = encode_base64url(payload_json);
    let signing_input = format!("{header}.{payload}");
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("test secret");
    mac.update(signing_input.as_bytes());
    let signature = encode_base64url_bytes(&mac.finalize().into_bytes());
    format!("{signing_input}.{signature}")
}

#[cfg(test)]
fn encode_base64url(input: &str) -> String {
    encode_base64url_bytes(input.as_bytes())
}

#[cfg(test)]
fn encode_base64url_bytes(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::new();
    for chunk in input.chunks(3) {
        let mut buf = [0u8; 3];
        for (target, source) in buf.iter_mut().zip(chunk.iter()) {
            *target = *source;
        }
        let triple = ((buf[0] as u32) << 16) | ((buf[1] as u32) << 8) | (buf[2] as u32);
        output.push(TABLE[((triple >> 18) & 0x3f) as usize] as char);
        output.push(TABLE[((triple >> 12) & 0x3f) as usize] as char);
        if chunk.len() > 1 {
            output.push(TABLE[((triple >> 6) & 0x3f) as usize] as char);
        }
        if chunk.len() > 2 {
            output.push(TABLE[(triple & 0x3f) as usize] as char);
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn does_not_treat_dotted_inline_permission_scopes_as_jwt() {
        assert!(!is_jwt_format(
            "tenant_id=tenant-a;user_id=admin-001;permission_scope=drive.storage.admin"
        ));
    }

    #[test]
    fn verifies_hmac_signed_jwt() {
        let payload = r#"{"tenant_id":"tenant-a","user_id":"user-001","app_id":"appbase"}"#;
        let token = encode_test_jwt_hmac(payload, "test-secret");
        let policy = DriveAuthValidationPolicy::require_signed_projection("test-secret");
        let claims = verify_jwt_hmac_claims(&token, &policy).expect("claims");
        assert_eq!(claims.get("tenant_id"), Some(&"tenant-a".to_string()));
        assert_eq!(claims.get("user_id"), Some(&"user-001".to_string()));
    }

    #[test]
    fn verifies_hmac_signed_jwt_with_kid_rotation_secret() {
        let payload = r#"{"tenant_id":"tenant-a","user_id":"user-001","app_id":"appbase"}"#;
        let token = encode_test_jwt_hmac_with_kid(payload, "tenant-a-secret", Some("tenant-a"));
        let policy = DriveAuthValidationPolicy {
            allow_inline_claim_tokens: false,
            jwt_hmac_secrets: BTreeMap::from([
                ("default".to_string(), "default-secret".to_string()),
                ("tenant-a".to_string(), "tenant-a-secret".to_string()),
            ]),
            jwt_jwks_keys: BTreeMap::new(),
        };
        let claims = verify_jwt_hmac_claims(&token, &policy).expect("claims");
        assert_eq!(claims.get("tenant_id"), Some(&"tenant-a".to_string()));
    }

    #[test]
    fn rejects_invalid_signature() {
        let payload = r#"{"tenant_id":"tenant-a","user_id":"user-001"}"#;
        let token = encode_test_jwt_hmac(payload, "test-secret");
        let policy = DriveAuthValidationPolicy::require_signed_projection("wrong-secret");
        let error = verify_jwt_hmac_claims(&token, &policy).expect_err("mismatch");
        assert!(matches!(error, TokenClaimsError::InvalidCredentials(_)));
    }
}
