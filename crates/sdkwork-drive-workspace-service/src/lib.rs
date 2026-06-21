pub mod application;
pub mod bootstrap;
pub mod domain;
pub mod infrastructure;
pub mod ports;

pub mod uploader {
    pub use crate::application::uploader_service::{
        CompleteStoredUploaderUploadCommand, DriveUploaderService, MarkUploaderPartUploadedCommand,
        PrepareUploaderUploadCommand, UploadBytesCommand, UploaderActor, UploaderRetention,
        UploaderTarget,
    };
    pub use crate::domain::uploader::{DriveUploadItem, DriveUploadPart};
}

use sdkwork_utils_rust::sha256_hash;

pub fn drive_share_token_hash(token: &str) -> String {
    format!("sha256:{}", sha256_hash(token.trim().as_bytes()))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DriveServiceError {
    Validation(String),
    Conflict(String),
    NotFound(String),
    PermissionDenied(String),
    Internal(String),
}

#[cfg(test)]
mod tests {
    use super::drive_share_token_hash;

    #[test]
    fn drive_share_token_hash_uses_sha256_hex_digest() {
        let digest = drive_share_token_hash("abc");

        assert_eq!(
            digest,
            "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn drive_share_token_hash_normalizes_surrounding_whitespace() {
        assert_eq!(
            drive_share_token_hash("abc"),
            drive_share_token_hash(" abc\n")
        );
    }
}
