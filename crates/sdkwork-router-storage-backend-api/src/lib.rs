#![allow(clippy::result_large_err)]

mod app_context;
mod audit;
mod auth;
mod binding_handlers;
mod bucket_handlers;
mod config;
mod dto;
mod error;
mod handlers;
mod health_handlers;
mod object_handlers;
mod object_store;
mod provider_handlers;
mod provider_lookup;
mod provider_mappers;
mod routes;
mod state;
mod validators;
mod web_bootstrap;
pub mod http_route_manifest;

pub use http_route_manifest::storage_route_manifest;
pub use config::{AdminStorageConfig, DriveAdminStorageObjectStoreAdapter};
pub use routes::*;
pub use state::AdminStorageState;
pub use web_bootstrap::{
    wrap_router_with_iam_database_web_framework, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};
