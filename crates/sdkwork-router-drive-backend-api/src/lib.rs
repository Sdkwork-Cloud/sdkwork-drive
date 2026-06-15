#![allow(clippy::result_large_err)]

mod audit;
mod audit_event_handlers;
mod auth;
mod download_package_handlers;
mod dto;
mod error;
mod handlers;
mod health_handlers;
mod label_handlers;
mod maintenance_handlers;
mod mappers;
mod object_store;
mod routes;
mod space_quota_handlers;
mod state;
mod storage_provider_binding_handlers;
mod storage_provider_handlers;
mod validators;

pub use routes::*;
