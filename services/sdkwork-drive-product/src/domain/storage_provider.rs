#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DriveStorageProviderKind {
    LocalFilesystem,
    S3Compatible,
    GoogleCloudStorage,
    AliyunOss,
    TencentCos,
    HuaweiObs,
    VolcengineTos,
    Custom(String),
}

impl DriveStorageProviderKind {
    pub const CUSTOM_PREFIX: &'static str = "custom:";

    pub fn as_str(&self) -> &str {
        match self {
            Self::LocalFilesystem => "local_filesystem",
            Self::S3Compatible => "s3_compatible",
            Self::GoogleCloudStorage => "google_cloud_storage",
            Self::AliyunOss => "aliyun_oss",
            Self::TencentCos => "tencent_cos",
            Self::HuaweiObs => "huawei_obs",
            Self::VolcengineTos => "volcengine_tos",
            Self::Custom(value) => value.as_str(),
        }
    }

    pub fn try_from_str(raw: &str) -> Option<Self> {
        let normalized = raw.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "local_filesystem" => Some(Self::LocalFilesystem),
            "s3_compatible" => Some(Self::S3Compatible),
            "google_cloud_storage" => Some(Self::GoogleCloudStorage),
            "aliyun_oss" => Some(Self::AliyunOss),
            "tencent_cos" => Some(Self::TencentCos),
            "huawei_obs" => Some(Self::HuaweiObs),
            "volcengine_tos" => Some(Self::VolcengineTos),
            _ => {
                let suffix = normalized.strip_prefix(Self::CUSTOM_PREFIX)?;
                if is_valid_custom_suffix(suffix) {
                    Some(Self::Custom(normalized))
                } else {
                    None
                }
            }
        }
    }
}

fn is_valid_custom_suffix(raw: &str) -> bool {
    if raw.len() < 2 || raw.len() > 32 {
        return false;
    }
    raw.chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || matches!(ch, '_' | '-'))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DriveStorageProvider {
    pub id: String,
    pub provider_kind: DriveStorageProviderKind,
    pub name: String,
    pub endpoint_url: String,
    pub region: Option<String>,
    pub bucket: String,
    pub path_style: bool,
    pub strict_tls: bool,
    pub credential_ref: Option<String>,
    pub server_side_encryption_mode: Option<String>,
    pub default_storage_class: Option<String>,
    pub status: String,
    pub version: i64,
}
