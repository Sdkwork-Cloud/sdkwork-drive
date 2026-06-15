pub mod application;
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

use sha2::{Digest, Sha256};

pub fn drive_share_token_hash(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.trim().as_bytes());
    let digest = hasher.finalize();
    let mut token_hash = String::with_capacity("sha256:".len() + 64);
    token_hash.push_str("sha256:");
    for byte in digest {
        push_hex_byte(&mut token_hash, byte);
    }
    token_hash
}

fn push_hex_byte(output: &mut String, byte: u8) {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    output.push(char::from(HEX[usize::from(byte >> 4)]));
    output.push(char::from(HEX[usize::from(byte & 0x0f)]));
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
