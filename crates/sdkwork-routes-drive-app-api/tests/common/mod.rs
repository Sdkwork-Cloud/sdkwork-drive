#![allow(dead_code)]

use axum::body::Body;
use axum::Router;
use http::{Method, Request};
use sdkwork_routes_drive_app_api::build_router_with_pool_and_iam;
use sdkwork_web_core::{access_token_jwt, auth_token_jwt, encode_unsigned_test_jwt};
use serde_json::json;
use sqlx::AnyPool;

const DEFAULT_SESSION_ID: &str = "session-1";

pub fn auth_token(tenant: &str, user: &str, app_id: &str) -> String {
    auth_token_jwt(tenant, user, DEFAULT_SESSION_ID, app_id)
}

pub fn access_token(tenant: &str, user: &str, app_id: &str) -> String {
    access_token_jwt(tenant, user, DEFAULT_SESSION_ID, app_id)
}

pub fn auth_token_for_organization(
    tenant: &str,
    user: &str,
    organization_id: &str,
    app_id: &str,
) -> String {
    encode_unsigned_test_jwt(json!({
        "token_type": "auth",
        "tenant_id": tenant,
        "user_id": user,
        "organization_id": organization_id,
        "session_id": DEFAULT_SESSION_ID,
        "app_id": app_id,
        "auth_level": "password",
        "login_scope": "ORGANIZATION",
    }))
}

pub fn access_token_for_organization(
    tenant: &str,
    user: &str,
    organization_id: &str,
    app_id: &str,
) -> String {
    encode_unsigned_test_jwt(json!({
        "token_type": "access",
        "tenant_id": tenant,
        "user_id": user,
        "organization_id": organization_id,
        "session_id": DEFAULT_SESSION_ID,
        "app_id": app_id,
        "environment": "prod",
        "deployment_mode": "saas",
        "login_scope": "ORGANIZATION",
    }))
}

pub fn default_user_for_tenant(tenant: &str) -> String {
    if let Some(suffix) = tenant.strip_prefix("tenant-") {
        return format!("user-{suffix}");
    }
    "user-001".to_string()
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
            if let Some(user_id) = segment.strip_prefix("userId=") {
                return percent_decode(user_id);
            }
        }
    }
    default_user_for_tenant(tenant)
}

pub fn authed_get_uri(uri: impl AsRef<str>, tenant: &str) -> Request<Body> {
    let user = user_from_uri(uri.as_ref(), tenant);
    authed_get(uri, tenant, &user, "appbase")
}

fn percent_decode(value: &str) -> String {
    value.replace("%40", "@")
}

pub fn test_router_with_pool(pool: AnyPool) -> Router {
    build_router_with_pool_and_iam(pool)
}

pub fn authed_request(
    method: Method,
    uri: impl AsRef<str>,
    tenant: &str,
    user: &str,
    app_id: &str,
    body: Body,
) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri.as_ref())
        .header(
            "authorization",
            format!("Bearer {}", auth_token(tenant, user, app_id)),
        )
        .header("access-token", access_token(tenant, user, app_id))
        .body(body)
        .expect("authed request should be built")
}

pub fn authed_get(uri: impl AsRef<str>, tenant: &str, user: &str, app_id: &str) -> Request<Body> {
    authed_request(Method::GET, uri, tenant, user, app_id, Body::empty())
}

pub fn authed_post_json(
    uri: impl AsRef<str>,
    tenant: &str,
    user: &str,
    app_id: &str,
    body: impl Into<Body>,
) -> Request<Body> {
    Request::builder()
        .method(Method::POST)
        .uri(uri.as_ref())
        .header(
            "authorization",
            format!("Bearer {}", auth_token(tenant, user, app_id)),
        )
        .header("access-token", access_token(tenant, user, app_id))
        .header("content-type", "application/json")
        .body(body.into())
        .expect("authed post request should be built")
}
