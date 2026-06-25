use std::sync::atomic::AtomicU64;

pub(crate) const DEFAULT_DOWNLOAD_PUBLIC_BASE_URL: &str = "http://127.0.0.1:18080/app/v3/api/drive";
pub(crate) const DOWNLOAD_PACKAGE_MAX_FILES: usize = 500;
pub(crate) const DOWNLOAD_PACKAGE_MAX_TOTAL_BYTES: i64 = 1_073_741_824;
pub(crate) const ARCHIVE_MAX_ENTRIES: usize = 500;
pub(crate) const ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES: i64 = 1_073_741_824;
pub(crate) const SDKWORK_SNOWFLAKE_EPOCH_MS: u64 = 1_609_459_200_000;
pub(crate) const SDKWORK_DRIVE_WORKER_ID: u64 = 17;
pub(crate) static LAST_APP_SNOWFLAKE_ID: AtomicU64 = AtomicU64::new(0);
