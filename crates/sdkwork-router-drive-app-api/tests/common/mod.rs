use axum::body::Body;
use http::{Method, Request};

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
