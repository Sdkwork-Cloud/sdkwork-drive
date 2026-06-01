use crate::domain::storage_provider::{DriveStorageProvider, DriveStorageProviderKind};
use crate::ports::storage_provider_store::{
    DriveStorageProviderStore, NewDriveStorageProvider, UpdateDriveStorageProvider,
};
use crate::DriveProductError;

#[derive(Debug, Clone)]
pub struct CreateStorageProviderCommand {
    pub id: String,
    pub provider_kind: DriveStorageProviderKind,
    pub name: String,
    pub endpoint_url: String,
    pub region: Option<String>,
    pub bucket: String,
    pub path_style: Option<bool>,
    pub credential_ref: Option<String>,
    pub server_side_encryption_mode: Option<String>,
    pub default_storage_class: Option<String>,
    pub status: Option<String>,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct ListStorageProvidersCommand {
    pub status: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateStorageProviderCommand {
    pub provider_id: String,
    pub name: Option<String>,
    pub endpoint_url: Option<String>,
    pub region: Option<String>,
    pub bucket: Option<String>,
    pub path_style: Option<bool>,
    pub credential_ref: Option<String>,
    pub server_side_encryption_mode: Option<String>,
    pub default_storage_class: Option<String>,
    pub status: Option<String>,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct DeleteStorageProviderCommand {
    pub provider_id: String,
    pub operator_id: String,
}

#[derive(Debug, Clone)]
pub struct TestStorageProviderCommand {
    pub provider_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteStorageProviderResult {
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestStorageProviderResult {
    pub provider_id: String,
    pub reachable: bool,
}

#[derive(Debug, Clone)]
pub struct DriveStorageProviderService<S>
where
    S: DriveStorageProviderStore,
{
    store: S,
}

impl<S> DriveStorageProviderService<S>
where
    S: DriveStorageProviderStore,
{
    fn default_path_style_for_provider(kind: &DriveStorageProviderKind) -> bool {
        match kind {
            DriveStorageProviderKind::AliyunOss | DriveStorageProviderKind::GoogleCloudStorage => {
                false
            }
            DriveStorageProviderKind::Custom(value) => {
                let suffix = value
                    .trim()
                    .to_ascii_lowercase()
                    .strip_prefix(DriveStorageProviderKind::CUSTOM_PREFIX)
                    .map(str::to_string);
                !matches!(
                    suffix.as_deref(),
                    Some("aws")
                        | Some("aws_s3")
                        | Some("amazon_s3")
                        | Some("oss")
                        | Some("aliyun")
                        | Some("aliyun_oss")
                        | Some("cos")
                        | Some("tencent")
                        | Some("tencent_cos")
                        | Some("obs")
                        | Some("huawei")
                        | Some("huawei_obs")
                        | Some("gcs")
                        | Some("google_cloud_storage")
                        | Some("google_storage")
                        | Some("b2")
                        | Some("backblaze")
                        | Some("backblaze_b2")
                )
            }
            _ => true,
        }
    }

    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub async fn create_storage_provider(
        &self,
        command: CreateStorageProviderCommand,
    ) -> Result<DriveStorageProvider, DriveProductError> {
        if command.id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "storage provider id is required".to_string(),
            ));
        }
        if command.name.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "name is required".to_string(),
            ));
        }
        if command.endpoint_url.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "endpoint_url is required".to_string(),
            ));
        }
        if command.bucket.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "bucket is required".to_string(),
            ));
        }
        if command.operator_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "operator_id is required".to_string(),
            ));
        }

        let status = command
            .status
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("active")
            .to_string();
        let region = command
            .region
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string);
        let server_side_encryption_mode = command
            .server_side_encryption_mode
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string);
        let default_storage_class = command
            .default_storage_class
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string);

        self.store
            .insert_storage_provider(&NewDriveStorageProvider {
                id: command.id,
                provider_kind: command.provider_kind.as_str().to_string(),
                name: command.name.trim().to_string(),
                endpoint_url: command.endpoint_url,
                region,
                bucket: command.bucket,
                path_style: command.path_style.unwrap_or_else(|| {
                    Self::default_path_style_for_provider(&command.provider_kind)
                }),
                credential_ref: command.credential_ref,
                server_side_encryption_mode,
                default_storage_class,
                status,
                created_by: command.operator_id.clone(),
                updated_by: command.operator_id,
            })
            .await
    }

    pub async fn list_storage_providers(
        &self,
        command: ListStorageProvidersCommand,
    ) -> Result<Vec<DriveStorageProvider>, DriveProductError> {
        self.store
            .list_storage_providers(command.status.as_deref())
            .await
    }

    pub async fn update_storage_provider(
        &self,
        command: UpdateStorageProviderCommand,
    ) -> Result<DriveStorageProvider, DriveProductError> {
        let provider_id = command.provider_id.trim();
        if provider_id.is_empty() {
            return Err(DriveProductError::Validation(
                "provider_id is required".to_string(),
            ));
        }
        if command.operator_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "operator_id is required".to_string(),
            ));
        }

        let current = self
            .store
            .find_storage_provider(provider_id)
            .await?
            .ok_or_else(|| DriveProductError::NotFound("storage provider not found".to_string()))?;
        let name = command
            .name
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(current.name.as_str())
            .to_string();

        let endpoint_url = command
            .endpoint_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(current.endpoint_url.as_str())
            .to_string();
        let bucket = command
            .bucket
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(current.bucket.as_str())
            .to_string();
        let status = command
            .status
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(current.status.as_str())
            .to_string();
        let region = match command.region {
            Some(region) if region.trim().is_empty() => None,
            Some(region) => Some(region.trim().to_string()),
            None => current.region,
        };
        let path_style = command.path_style.unwrap_or(current.path_style);
        let server_side_encryption_mode = match command.server_side_encryption_mode {
            Some(mode) if mode.trim().is_empty() => None,
            Some(mode) => Some(mode.trim().to_string()),
            None => current.server_side_encryption_mode,
        };
        let default_storage_class = match command.default_storage_class {
            Some(class) if class.trim().is_empty() => None,
            Some(class) => Some(class.trim().to_string()),
            None => current.default_storage_class,
        };

        self.store
            .update_storage_provider(
                provider_id,
                &UpdateDriveStorageProvider {
                    name,
                    endpoint_url,
                    region,
                    bucket,
                    path_style,
                    credential_ref: match command.credential_ref {
                        Some(ref value) if value.trim().is_empty() => None,
                        Some(value) => Some(value),
                        None => current.credential_ref,
                    },
                    server_side_encryption_mode,
                    default_storage_class,
                    status,
                    updated_by: command.operator_id,
                },
            )
            .await
    }

    pub async fn test_storage_provider(
        &self,
        command: TestStorageProviderCommand,
    ) -> Result<TestStorageProviderResult, DriveProductError> {
        let provider_id = command.provider_id.trim();
        if provider_id.is_empty() {
            return Err(DriveProductError::Validation(
                "provider_id is required".to_string(),
            ));
        }
        let Some(provider) = self.store.find_storage_provider(provider_id).await? else {
            return Err(DriveProductError::NotFound(
                "storage provider not found".to_string(),
            ));
        };

        Ok(TestStorageProviderResult {
            provider_id: provider.id,
            reachable: provider.status == "active" || provider.status == "disabled",
        })
    }

    pub async fn delete_storage_provider(
        &self,
        command: DeleteStorageProviderCommand,
    ) -> Result<DeleteStorageProviderResult, DriveProductError> {
        if command.provider_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "provider_id is required".to_string(),
            ));
        }
        if command.operator_id.trim().is_empty() {
            return Err(DriveProductError::Validation(
                "operator_id is required".to_string(),
            ));
        }
        let deleted = self
            .store
            .delete_storage_provider(command.provider_id.trim())
            .await?;
        if !deleted {
            return Err(DriveProductError::NotFound(
                "storage provider not found".to_string(),
            ));
        }
        Ok(DeleteStorageProviderResult { deleted })
    }
}
