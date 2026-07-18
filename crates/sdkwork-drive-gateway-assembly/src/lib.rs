//! Gateway assembly for sdkwork-drive.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.
// SDKWORK-ASSEMBLY-LIB-CUSTOM

mod bootstrap;
mod generated;

pub use bootstrap::{
    assemble_application_business_router, assemble_application_business_router_from_env,
    assemble_application_router, assemble_backend_business_router_from_env, ApplicationAssembly,
};

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
