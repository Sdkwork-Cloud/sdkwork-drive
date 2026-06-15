//! SDKWork Drive contract types.
//!
//! This crate defines the public contract types for the SDKWork Drive domain.
//! It re-exports storage contract types and defines domain-specific types
//! for spaces, nodes, uploads, downloads, and API contracts.

pub use sdkwork_drive_storage_contract as storage;

pub mod api;
pub mod drive;

mod error;
pub use error::DriveContractError;

mod ids;
pub use ids::{DriveNodeId, DriveProviderId, DriveSpaceId, DriveUploadSessionId};

mod uri;
pub use uri::DriveUri;
