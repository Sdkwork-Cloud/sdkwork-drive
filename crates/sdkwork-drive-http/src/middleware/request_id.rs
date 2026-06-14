use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

/// Header name for request ID.
pub const REQUEST_ID_HEADER: &str = "X-Request-Id";

/// Middleware that ensures every request has a request ID.
///
/// If the request already has an `X-Request-Id` header, it is preserved.
/// Otherwise, a new UUID is generated and added to the request and response.
pub async fn request_id_middleware(mut request: Request, next: Next) -> Response {
    let request_id = request
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    // Insert request ID into request extensions for downstream handlers
    request
        .extensions_mut()
        .insert(RequestId(request_id.clone()));

    let mut response = next.run(request).await;

    // Add request ID to response headers
    if let Ok(header_value) = request_id.parse() {
        response.headers_mut().insert(REQUEST_ID_HEADER, header_value);
    }

    response
}

/// Request ID extracted from request extensions.
#[derive(Debug, Clone)]
pub struct RequestId(pub String);

impl RequestId {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
