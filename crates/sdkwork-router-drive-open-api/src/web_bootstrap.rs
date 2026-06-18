use std::sync::Arc;

use axum::Router;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{
    DefaultOpenApiWebRequestContextResolver, DomainContextInjector, WebRequestContext,
    WebRequestContextProfile, WebRequestContextResolver,
};

use crate::http_route_manifest::open_route_manifest;

pub fn drive_open_api_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_owned(),
        "/metrics".to_owned(),
        "/open/v3/api/drive/share_links".to_owned(),
    ]
}

pub fn drive_open_api_prefixes() -> Vec<String> {
    vec!["/open/v3/api".to_owned()]
}

#[derive(Clone, Default)]
struct DriveOpenApiContextInjector;

impl DomainContextInjector for DriveOpenApiContextInjector {
    fn inject(&self, _request: &mut http::Request<axum::body::Body>, _context: &WebRequestContext) {
    }
}

pub fn wrap_router_with_web_framework<R>(resolver: R, router: Router) -> Router
where
    R: WebRequestContextResolver + Clone + 'static,
{
    let route_manifest = open_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&drive_open_api_public_path_prefixes())
        .expect("drive open-api public prefixes must not cover protected manifest routes");

    let layer = WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            open_api_prefixes: drive_open_api_prefixes(),
            public_path_prefixes: drive_open_api_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest)
        .with_domain_injector(Arc::new(DriveOpenApiContextInjector));
    with_web_request_context(router, layer)
}

pub fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    wrap_router_with_web_framework(DefaultOpenApiWebRequestContextResolver::default(), router)
}
