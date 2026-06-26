//! SDKWork Drive HTTP utilities.
//!
//! This crate provides HTTP-related utilities for Drive API services,
//! including request context extraction, response mapping, and middleware.

pub mod context;
pub mod infra;
pub mod metrics;
pub mod middleware;
pub mod problem_correlation;
pub mod problem_detail;
pub mod response;
pub mod server;
pub mod trace_ids;
pub mod web_app_context;
