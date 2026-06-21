use sdkwork_utils_rust::sha256_hash;

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    format!("sha256:{}", sha256_hash(bytes))
}
