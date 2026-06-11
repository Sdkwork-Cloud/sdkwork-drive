pub const SDK_NAME: &str = "sdkwork-drive-sdk";
pub const PACKAGE_NAME: &str = "sdkwork-drive-sdk-generated-rust";
pub const STANDARD_PROFILE: &str = "sdkwork-v3";
pub const BASE_URL: &str = "http://127.0.0.1:18082";
pub const API_PREFIX: &str = "/open/v3/api";

pub fn operations() -> &'static [(&'static str, &'static str, &'static str)] {
  &[
    ("openShareLinks.downloadUrls.create", "POST", "/open/v3/api/drive/share_links/{token}/download_url"),
    ("openShareLinks.resolve", "GET", "/open/v3/api/drive/share_links/{token}"),
  ]
}
