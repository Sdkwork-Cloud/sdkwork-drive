#![allow(clippy::result_large_err)]

mod app_context;
mod archive;
mod archive_storage;
mod asset_handlers;
mod collaboration_repository;
mod constants;
mod download_packages;
mod dto;
mod error;
mod handlers;
mod hashing;
mod health_handlers;
mod ids;
mod mappers;
mod metadata_repository;
mod node_repository;
mod object_store;
mod routes;
mod space_repository;
mod state;
mod storage_keys;
mod time;
mod uploader;
mod validators;
mod watch_repository;
mod web_bootstrap;
pub mod http_route_manifest;

pub use http_route_manifest::app_route_manifest;
pub use routes::*;
pub use state::AppState;
pub use web_bootstrap::{
    wrap_router_with_iam_database_web_framework, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};
