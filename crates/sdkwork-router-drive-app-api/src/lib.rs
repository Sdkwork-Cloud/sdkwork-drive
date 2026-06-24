#![allow(clippy::result_large_err)]

mod acl;
mod acl_sql;
mod app_context;
mod archive;
mod archive_storage;
mod assets;
mod collaboration_repository;
mod constants;
mod download_packages;
mod dto;
mod error;
mod handlers;
mod hashing;
mod health_handlers;
pub mod http_route_manifest;
mod ids;
mod mappers;
mod metadata_repository;
mod node_repository;
mod object_store;
mod rate_limit;
mod routes;
mod space_repository;
mod state;
mod storage_keys;
mod time;
mod uploader;
mod validators;
mod watch_repository;
mod web_bootstrap;
mod webhook_url;

pub use http_route_manifest::app_route_manifest;
pub use routes::*;
pub use state::AppState;
pub use web_bootstrap::{
    wrap_router_with_iam_database_web_framework, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};
