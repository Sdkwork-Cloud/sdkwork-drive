use crate::ports::storage_object_store::{
    DownloadSignCommand, DriveDownloadSigner, DriveStorageObjectStore,
};
use crate::DriveProductError;
use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct CreateDownloadUrlCommand {
    pub tenant_id: String,
    pub node_id: String,
    pub requested_ttl_seconds: u32,
    pub request_base_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateDownloadUrlResult {
    pub download_url: String,
    pub expires_at_epoch_ms: i64,
    pub method: String,
    pub signed_source_url: String,
}

#[derive(Debug, Clone)]
pub struct ResolveDownloadTokenCommand {
    pub tenant_id: String,
    pub token: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolveDownloadTokenResult {
    pub node_id: String,
    pub expires_at_epoch_ms: i64,
    pub method: String,
    pub signed_source_url: String,
    pub headers: BTreeMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct DriveDownloadService<S, G>
where
    S: DriveStorageObjectStore,
    G: DriveDownloadSigner,
{
    storage_object_store: S,
    signer: G,
}

impl<S, G> DriveDownloadService<S, G>
where
    S: DriveStorageObjectStore,
    G: DriveDownloadSigner,
{
    pub fn new(storage_object_store: S, signer: G) -> Self {
        Self {
            storage_object_store,
            signer,
        }
    }

    pub async fn create_download_url(
        &self,
        command: CreateDownloadUrlCommand,
    ) -> Result<CreateDownloadUrlResult, DriveProductError> {
        if command.tenant_id.trim().is_empty() || command.node_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "tenant_id and node_id are required".to_string(),
            ));
        }
        if command.requested_ttl_seconds < 30 || command.requested_ttl_seconds > 300 {
            return Err(DriveProductError::Validation(
                "requested_ttl_seconds must be between 30 and 300 seconds".to_string(),
            ));
        }

        let object = self
            .storage_object_store
            .find_latest_active_by_node(&command.tenant_id, &command.node_id)
            .await?
            .ok_or_else(|| {
                DriveProductError::NotFound(
                    "storage object for node is not found or inactive".to_string(),
                )
            })?;

        let now_epoch_ms = now_epoch_ms();
        let expires_at_epoch_ms = now_epoch_ms + i64::from(command.requested_ttl_seconds) * 1000;

        let signed = self
            .signer
            .sign_download(DownloadSignCommand {
                storage_provider_id: object.storage_provider_id,
                bucket: object.bucket,
                object_key: object.object_key,
                expires_at_epoch_ms,
            })
            .await?;

        let token = build_download_token(&command.node_id, expires_at_epoch_ms);
        let base = command.request_base_url.trim_end_matches('/');
        let download_url = format!("{base}/download_tokens/{token}");

        Ok(CreateDownloadUrlResult {
            download_url,
            expires_at_epoch_ms: signed.expires_at_epoch_ms,
            method: signed.method,
            signed_source_url: signed.raw_url,
        })
    }

    pub async fn resolve_download_token(
        &self,
        command: ResolveDownloadTokenCommand,
    ) -> Result<ResolveDownloadTokenResult, DriveProductError> {
        if command.tenant_id.trim().is_empty() || command.token.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "tenant_id and token are required".to_string(),
            ));
        }

        let parsed = parse_download_token(command.token.trim())?;
        let now_epoch_ms = now_epoch_ms();
        if parsed.expires_at_epoch_ms <= now_epoch_ms {
            return Err(DriveProductError::NotFound(
                "download token has expired".to_string(),
            ));
        }
        if parsed.expires_at_epoch_ms > now_epoch_ms + 300_000 {
            return Err(DriveProductError::Validation(
                "download token lifetime is invalid".to_string(),
            ));
        }

        let object = self
            .storage_object_store
            .find_latest_active_by_node(command.tenant_id.trim(), &parsed.node_id)
            .await?
            .ok_or_else(|| {
                DriveProductError::NotFound(
                    "storage object for node is not found or inactive".to_string(),
                )
            })?;

        let signed = self
            .signer
            .sign_download(DownloadSignCommand {
                storage_provider_id: object.storage_provider_id,
                bucket: object.bucket,
                object_key: object.object_key,
                expires_at_epoch_ms: parsed.expires_at_epoch_ms,
            })
            .await?;

        Ok(ResolveDownloadTokenResult {
            node_id: parsed.node_id,
            expires_at_epoch_ms: signed.expires_at_epoch_ms,
            method: signed.method,
            signed_source_url: signed.raw_url,
            headers: signed.headers,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ParsedDownloadToken {
    node_id: String,
    expires_at_epoch_ms: i64,
}

pub fn build_download_token(node_id: &str, expires_at_epoch_ms: i64) -> String {
    format!("dlv1_{}_{}", encode_hex(node_id), expires_at_epoch_ms)
}

fn parse_download_token(token: &str) -> Result<ParsedDownloadToken, DriveProductError> {
    let Some(suffix) = token.strip_prefix("dlv1_") else {
        return Err(DriveProductError::Validation(
            "download token format is invalid".to_string(),
        ));
    };
    let Some((node_hex, expires_raw)) = suffix.rsplit_once('_') else {
        return Err(DriveProductError::Validation(
            "download token format is invalid".to_string(),
        ));
    };
    let node_id = decode_hex(node_hex)?;
    if node_id.trim().is_empty() {
        return Err(DriveProductError::Validation(
            "download token node id is invalid".to_string(),
        ));
    }

    let expires_at_epoch_ms = expires_raw.parse::<i64>().map_err(|_| {
        DriveProductError::Validation("download token expiration is invalid".to_string())
    })?;

    Ok(ParsedDownloadToken {
        node_id,
        expires_at_epoch_ms,
    })
}

fn encode_hex(value: &str) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn decode_hex(encoded: &str) -> Result<String, DriveProductError> {
    if encoded.is_empty() || !encoded.len().is_multiple_of(2) {
        return Err(DriveProductError::Validation(
            "download token node id is invalid".to_string(),
        ));
    }

    let mut bytes = Vec::with_capacity(encoded.len() / 2);
    let mut index = 0;
    while index < encoded.len() {
        let pair = &encoded[index..index + 2];
        let byte = u8::from_str_radix(pair, 16).map_err(|_| {
            DriveProductError::Validation("download token node id is invalid".to_string())
        })?;
        bytes.push(byte);
        index += 2;
    }

    String::from_utf8(bytes)
        .map_err(|_| DriveProductError::Validation("download token node id is invalid".to_string()))
}

fn now_epoch_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
