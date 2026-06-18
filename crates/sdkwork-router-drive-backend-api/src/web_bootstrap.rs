use std::sync::Arc;

use axum::Router;
use sdkwork_drive_security::DriveAppContext;
use sdkwork_iam_web_adapter::IamDatabaseWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{
    DefaultWebRequestContextResolver, DomainContextInjector, WebAuthLevel, WebDeploymentMode,
    WebEnvironment, WebRequestContext, WebRequestContextProfile, WebRequestPrincipal,
    WebSubjectType,
};

use crate::http_route_manifest::backend_route_manifest;

pub fn drive_backend_public_path_prefixes() -> Vec<String> {
    vec!["/healthz".to_owned(), "/metrics".to_owned()]
}

#[derive(Clone, Default)]
struct DriveBackendContextInjector;

impl DomainContextInjector for DriveBackendContextInjector {
    fn inject(&self, request: &mut http::Request<axum::body::Body>, context: &WebRequestContext) {
        if let Some(principal) = context.principal.as_ref() {
            request
                .extensions_mut()
                .insert(drive_app_context_from_web_principal(principal, context));
        }
    }
}

pub fn drive_app_context_from_web_principal(
    principal: &WebRequestPrincipal,
    context: &WebRequestContext,
) -> DriveAppContext {
    let environment = match principal.app.environment {
        WebEnvironment::Dev => Some("dev".to_owned()),
        WebEnvironment::Test => Some("test".to_owned()),
        WebEnvironment::Prod => Some("prod".to_owned()),
    };
    let deployment_mode = match principal.app.deployment_mode {
        WebDeploymentMode::Saas => Some("saas".to_owned()),
        WebDeploymentMode::Local => Some("local".to_owned()),
        WebDeploymentMode::Private => Some("private".to_owned()),
    };
    let auth_level = match principal.auth.auth_level {
        WebAuthLevel::Anonymous => Some("anonymous".to_owned()),
        WebAuthLevel::Password => Some("password".to_owned()),
        WebAuthLevel::Mfa => Some("mfa".to_owned()),
        WebAuthLevel::System | WebAuthLevel::ApiKey => Some("system".to_owned()),
    };
    let actor_kind = match principal.subject.subject_type {
        WebSubjectType::User => "user".to_owned(),
        WebSubjectType::Service => "service".to_owned(),
        WebSubjectType::System => "system".to_owned(),
        WebSubjectType::ApiKey => "api_key".to_owned(),
    };

    DriveAppContext {
        tenant_id: principal.tenant_id().to_owned(),
        user_id: principal.user_id().to_owned(),
        organization_id: principal.organization_id().map(str::to_owned),
        session_id: principal.session_id().map(str::to_owned),
        app_id: Some(principal.app_id().to_owned()),
        environment,
        deployment_mode,
        auth_level,
        data_scope: principal.scopes.data_scope.clone(),
        permission_scope: principal.scopes.permission_scope.clone(),
        actor_id: principal.user_id().to_owned(),
        actor_kind,
        device_id: None,
        request_id: context.request_id.0.clone(),
        trace_id: context.request_id.0.clone(),
    }
}

pub fn wrap_router_with_web_framework(
    resolver: DefaultWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_drive_backend_framework_layer(resolver))
}

pub fn wrap_router_with_iam_database_web_framework(
    resolver: IamDatabaseWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_drive_backend_framework_layer(resolver))
}

fn build_drive_backend_framework_layer<R>(resolver: R) -> WebFrameworkLayer<R>
where
    R: sdkwork_web_core::WebRequestContextResolver + Clone,
{
    let route_manifest = backend_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&drive_backend_public_path_prefixes())
        .expect("drive backend-api public prefixes must not cover protected manifest routes");

    WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            public_path_prefixes: drive_backend_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest)
        .with_domain_injector(Arc::new(DriveBackendContextInjector))
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    if std::env::var("SDKWORK_DRIVE_DATABASE_URL").is_ok()
        || std::env::var("SDKWORK_DRIVE_CONFIG_FILE").is_ok()
    {
        let resolver = sdkwork_iam_web_adapter::iam_database_resolver_from_env().await;
        return wrap_router_with_iam_database_web_framework(resolver, router);
    }

    wrap_router_with_web_framework(DefaultWebRequestContextResolver::default(), router)
}
