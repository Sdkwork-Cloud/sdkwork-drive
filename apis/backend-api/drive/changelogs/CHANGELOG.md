# Drive Backend API Changelog

## 0.1.0 — 2026-06-25

- Mark legacy `/backend/v3/api/drive/storage_providers*` and `storage_provider_bindings/default` operations as **deprecated**; use `drive-admin-storage-api` canonical `/backend/v3/api/drive/storage/*` routes instead.
- Document tenant quota policy update (`PUT /backend/v3/api/drive/quotas`) in the contract authority.

## 0.1.0 — 2026-06-24

- Initial SDKWork Drive backend API surface under `/backend/v3/api`.
- Storage provider administration, maintenance sweeps, quotas, labels, and audit APIs.
