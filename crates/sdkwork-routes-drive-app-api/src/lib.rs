#![allow(clippy::result_large_err)]

mod acl;
mod acl_sql;
mod app_context;
mod archive;
mod archive_storage;
mod assets;
mod collaboration_repository;
mod comment_handlers;
mod change_handlers;
mod constants;
mod download_handlers;
mod download_packages;
mod dto;
mod error;
mod handlers;
mod hashing;
pub mod http_route_manifest;
mod library_handlers;
mod node_lifecycle;
mod ids;
mod mappers;
mod metadata_repository;
mod metadata_handlers;
mod node_handlers;
mod node_repository;
mod node_support;
mod object_store;
mod permission_handlers;
mod quota_handlers;
mod rate_limit;
mod route_change;
mod routes;
mod share_link_handlers;
mod search_handlers;
mod space_repository;
mod space_handlers;
mod trash_handlers;
mod upload_handlers;
mod upload_support;
mod version_handlers;
mod state;
mod storage_keys;
mod time;
mod uploader;
mod validators;
mod watch_repository;
mod web_bootstrap;
mod watch_handlers;
mod webhook_url;

pub use http_route_manifest::app_route_manifest;
pub use routes::*;
pub use state::AppState;
pub use web_bootstrap::{
    wrap_router_with_iam_web_framework, wrap_router_with_web_framework,
    wrap_router_with_web_framework_from_env,
};

pub fn gateway_route_manifest() -> sdkwork_web_core::HttpRouteManifest {
    app_route_manifest()
}

pub async fn gateway_mount(pool: sqlx::AnyPool) -> axum::Router {
    build_protected_router_with_pool(pool).await
}
