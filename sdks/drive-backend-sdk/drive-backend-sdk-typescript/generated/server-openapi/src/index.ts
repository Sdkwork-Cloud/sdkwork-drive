export const sdkMetadata = {
  name: "drive-backend-sdk",
  packageName: "sdkwork-drive-backend-api-generated-typescript",
  language: "typescript",
  standardProfile: "sdkwork-v3",
  baseUrl: "http://127.0.0.1:18080",
  apiPrefix: "/backend/v3/api",
};

export const operations = {
  "auditEvents.list": { method: "GET", path: "/backend/v3/api/drive/audit_events" },
  "maintenance.jobs.list": { method: "GET", path: "/backend/v3/api/drive/maintenance/jobs" },
  "maintenance.objectSweep.start": { method: "POST", path: "/backend/v3/api/drive/maintenance/object_sweep" },
  "maintenance.uploadSessionSweep.start": { method: "POST", path: "/backend/v3/api/drive/maintenance/upload_session_sweep" },
  "quotas.summary": { method: "GET", path: "/backend/v3/api/drive/quotas" },
  "spaces.admin.list": { method: "GET", path: "/backend/v3/api/drive/spaces" },
  "storageProviders.create": { method: "POST", path: "/backend/v3/api/drive/storage_providers" },
  "storageProviders.delete": { method: "DELETE", path: "/backend/v3/api/drive/storage_providers/{providerId}" },
  "storageProviders.list": { method: "GET", path: "/backend/v3/api/drive/storage_providers" },
  "storageProviders.test": { method: "POST", path: "/backend/v3/api/drive/storage_providers/{providerId}/test" },
  "storageProviders.update": { method: "PATCH", path: "/backend/v3/api/drive/storage_providers/{providerId}" },
};
