#![allow(clippy::result_large_err)]

mod audit;
mod audit_event_handlers;
mod auth;
mod download_package_handlers;
mod dto;
mod error;
mod handlers;
mod health_handlers;
pub mod http_route_manifest;
mod label_handlers;
mod maintenance_handlers;
mod mappers;
mod rate_limit;
mod routes;
mod space_quota_handlers;
mod state;
mod tenant_context;
mod validators;
mod web_bootstrap;

pub use http_route_manifest::backend_route_manifest;
pub use routes::*;
pub use web_bootstrap::{
    wrap_router_with_iam_database_web_framework, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};
