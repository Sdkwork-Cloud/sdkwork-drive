#![allow(dead_code)]

use axum::body::Body;
use axum::Router;
use http::{Method, Request};
use sdkwork_drive_security::DriveAuthValidationPolicy;
use sdkwork_router_drive_app_api::build_router_with_pool_and_iam_policy;
use sqlx::AnyPool;

pub fn auth_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;auth_level=password"
    )
}

pub fn access_token(tenant: &str, user: &str) -> String {
    format!(
        "tenant_id={tenant};user_id={user};session_id=session-1;app_id=appbase;environment=prod;deployment_mode=saas"
    )
}

pub fn default_user_for_tenant(tenant: &str) -> String {
    if let Some(suffix) = tenant.strip_prefix("tenant-") {
        return format!("user-{suffix}");
    }
    "user-001".to_string()
}

pub fn strip_client_tenant_id_from_uri(uri: &str) -> String {
    let (path, query) = uri.split_once('?').map_or((uri, None), |(path, query)| (path, Some(query)));
    let Some(query) = query else {
        return path.to_string();
    };
    let filtered = query
        .split('&')
        .filter(|segment| !segment.is_empty() && !segment.starts_with("tenantId="))
        .collect::<Vec<_>>()
        .join("&");
    if filtered.is_empty() {
        path.to_string()
    } else {
        format!("{path}?{filtered}")
    }
}

pub fn tenant_from_uri(uri: &str) -> Option<String> {
    uri.split_once('?').and_then(|(_, query)| {
        query.split('&').find_map(|segment| {
            segment
                .strip_prefix("tenantId=")
                .map(|value| percent_decode(value))
        })
    })
}

pub fn user_from_uri(uri: &str, tenant: &str) -> String {
    if let Some((_, query)) = uri.split_once('?') {
        for segment in query.split('&') {
            if let Some(subject_id) = segment.strip_prefix("subjectId=") {
                return percent_decode(subject_id);
            }
            if let Some(operator_id) = segment.strip_prefix("operatorId=") {
                return percent_decode(operator_id);
            }
        }
    }
    default_user_for_tenant(tenant)
}

fn percent_decode(value: &str) -> String {
    value.replace("%40", "@")
}

pub fn test_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_pool_and_iam_policy(
        pool,
        DriveAuthValidationPolicy::allow_unsigned_for_development(),
    )
}

pub fn authed_request(
    method: Method,
    uri: impl AsRef<str>,
    tenant: &str,
    user: &str,
    body: Body,
) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri.as_ref())
        .header(
            "authorization",
            format!("Bearer {}", auth_token(tenant, user)),
        )
        .header("access-token", access_token(tenant, user))
        .body(body)
        .expect("authed request should be built")
}

pub fn authed_get(uri: impl AsRef<str>, tenant: &str, user: &str) -> Request<Body> {
    authed_request(Method::GET, uri, tenant, user, Body::empty())
}

pub fn authed_post_json(
    uri: impl AsRef<str>,
    tenant: &str,
    user: &str,
    body: impl Into<Body>,
) -> Request<Body> {
    Request::builder()
        .method(Method::POST)
        .uri(uri.as_ref())
        .header(
            "authorization",
            format!("Bearer {}", auth_token(tenant, user)),
        )
        .header("access-token", access_token(tenant, user))
        .header("content-type", "application/json")
        .body(body.into())
        .expect("authed post request should be built")
}
