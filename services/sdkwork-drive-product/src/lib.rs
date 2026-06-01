pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ports;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DriveProductError {
    Validation(String),
    Conflict(String),
    NotFound(String),
    PermissionDenied(String),
    Internal(String),
}
