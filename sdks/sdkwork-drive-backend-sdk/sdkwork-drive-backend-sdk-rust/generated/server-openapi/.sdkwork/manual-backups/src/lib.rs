pub const SDK_NAME: &str = "sdkwork-drive-backend-sdk";
pub const PACKAGE_NAME: &str = "sdkwork-drive-backend-sdk-generated-rust";
pub const STANDARD_PROFILE: &str = "sdkwork-v3";
pub const BASE_URL: &str = "http://127.0.0.1:18080";
pub const API_PREFIX: &str = "/backend/v3/api";

pub fn operations() -> &'static [(&'static str, &'static str, &'static str)] {
  &[
    ("auditEvents.list", "GET", "/backend/v3/api/drive/audit_events"),
    ("downloadPackages.list", "GET", "/backend/v3/api/drive/download_packages"),
    ("labels.create", "POST", "/backend/v3/api/drive/labels"),
    ("labels.delete", "DELETE", "/backend/v3/api/drive/labels/{labelId}"),
    ("labels.get", "GET", "/backend/v3/api/drive/labels/{labelId}"),
    ("labels.list", "GET", "/backend/v3/api/drive/labels"),
    ("labels.update", "PATCH", "/backend/v3/api/drive/labels/{labelId}"),
    ("maintenance.jobs.list", "GET", "/backend/v3/api/drive/maintenance/jobs"),
    ("maintenance.objectSweep.start", "POST", "/backend/v3/api/drive/maintenance/object_sweep"),
    ("maintenance.uploadSessionSweep.start", "POST", "/backend/v3/api/drive/maintenance/upload_session_sweep"),
    ("quotas.summary", "GET", "/backend/v3/api/drive/quotas"),
    ("spaces.admin.list", "GET", "/backend/v3/api/drive/spaces"),
    ("storageProviderBindings.default.get", "GET", "/backend/v3/api/drive/storage_provider_bindings/default"),
    ("storageProviderBindings.default.set", "PUT", "/backend/v3/api/drive/storage_provider_bindings/default"),
    ("storageProviders.activate", "POST", "/backend/v3/api/drive/storage_providers/{providerId}/activate"),
    ("storageProviders.bucket.create", "PUT", "/backend/v3/api/drive/storage_providers/{providerId}/bucket"),
    ("storageProviders.bucket.delete", "DELETE", "/backend/v3/api/drive/storage_providers/{providerId}/bucket"),
    ("storageProviders.bucket.head", "GET", "/backend/v3/api/drive/storage_providers/{providerId}/bucket"),
    ("storageProviders.capabilities.get", "GET", "/backend/v3/api/drive/storage_providers/{providerId}/capabilities"),
    ("storageProviders.create", "POST", "/backend/v3/api/drive/storage_providers"),
    ("storageProviders.credentials.rotate", "POST", "/backend/v3/api/drive/storage_providers/{providerId}/credentials/rotate"),
    ("storageProviders.deactivate", "POST", "/backend/v3/api/drive/storage_providers/{providerId}/deactivate"),
    ("storageProviders.delete", "DELETE", "/backend/v3/api/drive/storage_providers/{providerId}"),
    ("storageProviders.get", "GET", "/backend/v3/api/drive/storage_providers/{providerId}"),
    ("storageProviders.list", "GET", "/backend/v3/api/drive/storage_providers"),
    ("storageProviders.objects.copy", "POST", "/backend/v3/api/drive/storage_providers/{providerId}/objects/copy"),
    ("storageProviders.objects.delete", "DELETE", "/backend/v3/api/drive/storage_providers/{providerId}/objects/{objectKey}"),
    ("storageProviders.objects.head", "GET", "/backend/v3/api/drive/storage_providers/{providerId}/objects/{objectKey}"),
    ("storageProviders.objects.list", "GET", "/backend/v3/api/drive/storage_providers/{providerId}/objects"),
    ("storageProviders.test", "POST", "/backend/v3/api/drive/storage_providers/{providerId}/test"),
    ("storageProviders.update", "PATCH", "/backend/v3/api/drive/storage_providers/{providerId}"),
  ]
}
