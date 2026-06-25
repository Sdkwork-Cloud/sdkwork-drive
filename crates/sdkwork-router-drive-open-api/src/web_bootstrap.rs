use std::sync::Arc;

use axum::Router;
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{
    DefaultOpenApiWebRequestContextResolver, DomainContextInjector, WebRequestContext,
    WebRequestContextProfile, WebRequestContextResolver,
};

use crate::http_route_manifest::open_route_manifest;

pub fn drive_open_api_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_owned(),
        "/readyz".to_owned(),
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
    with_web_request_context(router, build_open_api_framework_layer(resolver))
}

pub fn wrap_router_with_iam_database_web_framework(
    resolver: IamDatabaseWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_open_api_framework_layer(resolver))
}

fn build_open_api_framework_layer<R>(resolver: R) -> WebFrameworkLayer<R>
where
    R: WebRequestContextResolver + Clone,
{
    let route_manifest = open_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&drive_open_api_public_path_prefixes())
        .expect("drive open-api public prefixes must not cover protected manifest routes");

    WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            open_api_prefixes: drive_open_api_prefixes(),
            public_path_prefixes: drive_open_api_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest)
        .with_domain_injector(Arc::new(DriveOpenApiContextInjector))
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_database_resolver_from_env().await;
    wrap_router_with_iam_database_web_framework(resolver, router)
}

/// Dev/test helper when callers need a synchronous open-api web framework layer.
pub fn wrap_router_with_dev_open_api_web_framework(router: Router) -> Router {
    wrap_router_with_web_framework(
        DefaultOpenApiWebRequestContextResolver::default(),
        router,
    )
}
