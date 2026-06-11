# sdkwork-drive Backend Design

> Status: Draft for owner review
> Date: 2026-06-01
> Scope: backend service, domain model, storage abstraction, database design, app/backend API contracts, SDK generation, and implementation planning foundation.

## 1. Goal

`sdkwork-drive` is a professional cloud-drive backend implemented in Rust. It must support normal drive usage, knowledge-base storage, AI-generated asset storage, app-scoped upload storage, S3-compatible object storage, SDK generation, and component-style reuse by other SDKWork applications.

The first delivery does not implement frontend UI or concrete `apps/*` product screens. It prepares the backend domain, database, service boundaries, API contracts, SDK generation surface, storage abstraction, security model, and performance model.

## 2. Reference Standards

The design follows the standards under:

- `../../../../sdkwork-specs/API_SPEC.md`
- `../../../../sdkwork-specs/DATABASE_SPEC.md`
- `../../../../sdkwork-specs/SDK_SPEC.md`
- `../../../../sdkwork-specs/SECURITY_SPEC.md`
- `../../../../sdkwork-specs/PERFORMANCE_SPEC.md`
- `../../../../sdkwork-specs/OBSERVABILITY_SPEC.md`
- `../../../../sdkwork-specs/IAM_SPEC.md`
- `../../../../sdkwork-specs/RUST_RPC_SPEC.md`

The project structure and technology choices align with:

- `../../../../sdkwork-claw-router`

The SDK generation flow aligns with:

- app-api and backend-api generated SDK families under `sdks/`
- `sdkwork-sdk-generator`
- SDKWork v3 standard profile: `--standard-profile sdkwork-v3`

Industry capability references:

- Google Drive API: Files, Permissions, Revisions, Changes
- Microsoft Graph / OneDrive: DriveItem, Permissions, Versions, Delta, Upload Session

## 3. Product Principles

1. Drive metadata and object bytes are separate. Database tables store metadata and object references; file content is stored in object storage.
2. File operations are permission-checked in backend service logic, not in UI or SDK wrappers.
3. All API behavior must be contract-first and SDK-generation-friendly.
4. Storage provider details must be hidden behind a compact object-store abstraction.
5. Drive can run as an independent backend service and can also be imported as Rust crates by other applications.
6. App API and backend API must remain stable across SaaS, local, private, and embedded deployments.
7. Special-purpose spaces are first-class domain concepts, not folders with special names.
8. No raw object key, temporary signed URL, token, credential, or storage secret becomes a business fact exposed to clients.

## 4. Non-Goals For Phase 1

- No frontend UI implementation.
- No desktop sync client.
- No online Office collaborative editing.
- No full DLP/eDiscovery product workflow.
- No hard dependency on one object storage provider.
- Storage provider kinds are standardized as:
  - `local_filesystem`
  - `s3_compatible`
  - `google_cloud_storage`
  - `aliyun_oss`
  - `tencent_cos`
  - `huawei_obs`
  - `volcengine_tos`
  - Extensible custom kinds via `custom:<vendor_key>` where `<vendor_key>` matches `[a-z0-9_-]{2,32}`.
  - Azure Blob is a future non-S3 plugin and must not be exposed until a concrete adapter exists.
- No raw frontend `fetch` or handwritten SDK transport layer.
- No direct database access from consumers importing the drive component.

## 5. Recommended Architecture

Use a Rust modular monolith with clean component boundaries.

The backend is deployable as services and reusable as crates:

- `services/sdkwork-drive-app-api` exposes user-facing `/app/v3/api`.
- `services/sdkwork-drive-backend-api` exposes operator `/backend/v3/api`.
- `services/sdkwork-drive-product` contains domain, application, ports, infrastructure, and API adapters.
- `crates/*` expose reusable contracts, storage abstraction, HTTP helpers, security, config, observability, and test support.

This keeps phase 1 transactionally simple and testable while allowing later split-out services for preview generation, full-text indexing, virus scanning, object sweep, and asynchronous ingestion.

## 6. Project Layout

```text
sdkwork-drive/
  Cargo.toml
  Cargo.lock
  README.md
  specs/
  docs/
    schema-registry/
      tables/
      frontend-field-contracts/
    superpowers/
      specs/
      plans/
  generated/
    openapi/
    schema/
    sdk/
  crates/
    sdkwork-drive-contract/
    sdkwork-drive-core/
    sdkwork-drive-config/
    sdkwork-drive-http/
    sdkwork-drive-security/
    sdkwork-drive-observability/
    sdkwork-drive-storage-contract/
    sdkwork-drive-storage-local/
    sdkwork-drive-storage-s3/
    sdkwork-drive-test-support/
  services/
    sdkwork-drive-product/
    sdkwork-drive-app-api/
    sdkwork-drive-backend-api/
    sdkwork-drive-gateway/
    sdkwork-drive-installer/
  sdks/
    sdkwork-drive-app-api/
    sdkwork-drive-backend-api/
  tools/
  tests/
```

### 6.1 Product Service Layout

```text
services/sdkwork-drive-product/src/
  api/
  application/
  domain/
  infrastructure/
    sql/
    object_store/
    redis/
    search/
    scanner/
    preview/
  ports/
  identity.rs
  lib.rs
```

Responsibilities:

- `api`: HTTP DTOs, routers, handlers, request extraction, response mapping.
- `application`: use cases, transactions, permission orchestration, quota reservation, storage coordination.
- `domain`: pure domain models, invariants, value objects, permission roles, state transitions.
- `ports`: traits for persistence, object storage, audit, search, scanning, preview, background jobs.
- `infrastructure`: SQLx stores, S3/local object store adapters, Redis cache/rate-limit adapters, search/scanner/preview adapters.

## 7. Technology Stack

Core stack:

- Language: Rust 2021.
- HTTP: `axum`, `tower`, `tower-http`.
- Runtime: `tokio`.
- Serialization: `serde`, `serde_json`.
- Database: PostgreSQL for production, SQLite for local/test compatibility.
- Database access: `sqlx`.
- Cache/rate/short-lived state: Redis.
- Observability: `tracing`, structured logs, metrics hooks, audit events.
- Object storage: S3-compatible storage first, hidden behind `DriveObjectStore`.
- SDK generation: OpenAPI -> `sdkwork-sdk-generator` using `--standard-profile sdkwork-v3`.

Production database target is PostgreSQL. SQLite support is for local/private lightweight mode and fast test coverage, following the style used by `sdkwork-claw-router`.

## 8. Domain Model

### 8.1 Core Objects

- `DriveSpace`: a top-level storage space, such as personal drive, team drive, knowledge-base drive, AI-generated assets, Git repository source storage, deployment content storage, or app upload storage.
- `DriveNode`: a file, folder, shortcut, or virtual reference inside a space.
- `DriveFileVersion`: immutable version record for file content.
- `DriveStorageObject`: object-storage fact record for physical bytes.
- `DriveUploadSession`: resumable upload command state.
- `DrivePermission`: direct or inherited ACL fact.
- `DriveShareLink`: hashed public or scoped sharing link.
- `DriveChangeLog`: append-only delta-sync event.
- `DriveQuotaUsage`: reserved and committed quota counters.
- `DriveAuditEvent`: append-oriented security and operation audit.

### 8.2 Space Types

`dr_drive_space.space_type` values:

| Code | Purpose | Visibility | Authorization |
| --- | --- | --- | --- |
| `personal` | User personal drive | Visible in normal drive | Owner + ACL |
| `team` | Organization/team drive | Visible to members | Space membership + ACL |
| `knowledge_base` | Knowledge-base corpus and source files | Product-controlled, often hidden from normal drive home | Knowledge-base ACL + drive ACL |
| `ai_generated` | AI-generated assets and output history | User/app visible by policy | Generation actor + app permission + ACL |
| `git_repository` | User-owned source-code repository workspace; every repository is one root folder under the user's Git repository space | App management view, not ordinary home by default | User owner + app management permission + ACL |
| `deployment` | Deployment content workspace for websites, apps, release bundles, and other deployed artifacts | Deployment management view, not ordinary home by default | App or user owner + deployment management permission + ACL |
| `app_upload` | App-scoped attachments and upload staging | App-scoped by default | App resource permission + upload token + ACL |

`shared_with_me` should be a virtual view built from permissions and share links, not a physical `space_type`.

### 8.3 Special Space Semantics

#### Knowledge Base Space

`knowledge_base` spaces store corpus source files, imported documents, cleaned source snapshots, parsing artifacts, and ingestion-ready material.

Rules:

- Must bind to a knowledge base identity.
- Upload requires knowledge-base write permission.
- Read requires both knowledge-base access and file-level authorization.
- Upload completion emits ingestion events.
- Index state is tracked separately from file state.
- Failed ingestion never deletes source files automatically.

#### AI Generated Space

`ai_generated` spaces store AI-generated images, audio, videos, documents, code packages, and other model outputs.

Rules:

- Must preserve generation provenance.
- Prompt text is not stored as ordinary metadata by default.
- Prompt reference should be hash or encrypted reference unless product explicitly allows plaintext retention.
- Generated assets can be saved to personal/team spaces through copy or reference promotion.
- Original generated asset history remains auditable.

#### App Upload Space

`app_upload` spaces store app-scoped attachments, temporary uploads, import packages, and files owned by another business resource.

Rules:

- Upload token must bind tenant, app, actor, resource type, resource id, and expiry.
- Files are not shown in normal drive home unless promoted.
- Owning app permission is checked before drive ACL.
- Temporary uploads require cleanup and retention policy.
- Promotion to normal drive is explicit and audited.

#### App Repository Space

`git_repository` spaces store user-owned source-code repositories. Each user has one `git_repository` space per tenant. Each repository is represented by one top-level folder under that space; source files, repository metadata, and related documents live inside that repository folder.

`deployment` spaces store deployment content for websites, apps, release bundles, and other deployed artifacts. Deployment spaces can be app-owned when the deployed content belongs to an application.

Rules:

- The uniqueness boundary is `(tenant_id, owner_subject_type, owner_subject_id, space_type)`, so one user receives one Git repository space per tenant.
- `app` spaces must be owned by `owner_subject_type='user'`; group, organization, and app owners use their own ordinary or app-upload spaces instead of user app repositories.
- `app` spaces are system-provisioned durable user repositories and must not be deleted through the generic app API. Delete, trash, restore, or purge an individual app by operating on its top-level app folder and descendants instead.
- The `app` space root accepts only app directories, represented by root-level `folder` nodes. Files, shortcuts, extracted archive files, copied files, and moved files must be placed inside a specific app folder.
- `git_repository`, `deployment`, and `app_upload` are distinct: `git_repository` stores source code, `deployment` stores deployed website/app content and release artifacts, while `app_upload` is app resource attachment and upload staging storage.
- App folders are ordinary Drive folders, so rename, move, sharing, versioning, trash, restore, and download behavior follows `DriveNode` rules.
- App release workflows should bind business app identity to the top-level folder metadata or future app profile table, not to S3 object keys.

## 9. Storage Abstraction

### 9.1 Design Goal

The file byte layer must support S3-compatible storage first and remain compact enough to support future storage backends:

- AWS S3
- MinIO
- Alibaba OSS
- Tencent COS
- Google Cloud Storage
- local filesystem for development and tests
- Azure Blob as a future dedicated plugin, not part of the current S3-compatible provider contract
- future encrypted or tenant-isolated storage backends

Business logic must never depend on provider SDK details.

### 9.2 Object Store Contract

The stable abstraction is `DriveObjectStore`.

Design-level trait:

```rust
pub trait DriveObjectStore: Send + Sync {
    fn provider_kind(&self) -> DriveStorageProviderKind;
    fn capabilities(&self) -> DriveObjectStoreCapabilities;

    async fn create_multipart_upload(
        &self,
        request: CreateMultipartUploadRequest,
    ) -> Result<CreateMultipartUploadResult, DriveObjectStoreError>;

    async fn presign_upload_part(
        &self,
        request: PresignUploadPartRequest,
    ) -> Result<PresignedPartUpload, DriveObjectStoreError>;

    async fn complete_multipart_upload(
        &self,
        request: CompleteMultipartUploadRequest,
    ) -> Result<CompletedObject, DriveObjectStoreError>;

    async fn abort_multipart_upload(
        &self,
        request: AbortMultipartUploadRequest,
    ) -> Result<(), DriveObjectStoreError>;

    async fn put_object(
        &self,
        request: PutObjectRequest,
    ) -> Result<StoredObject, DriveObjectStoreError>;

    async fn get_object_stream(
        &self,
        request: GetObjectRequest,
    ) -> Result<ObjectByteStream, DriveObjectStoreError>;

    async fn presign_download(
        &self,
        request: PresignDownloadRequest,
    ) -> Result<PresignedDownload, DriveObjectStoreError>;

    async fn delete_object(
        &self,
        request: DeleteObjectRequest,
    ) -> Result<(), DriveObjectStoreError>;

    async fn head_object(
        &self,
        request: HeadObjectRequest,
    ) -> Result<ObjectMetadata, DriveObjectStoreError>;
}
```

The implementation may use concrete SDKs internally. The product service only sees the trait, request DTOs, result DTOs, and stable error codes.

### 9.3 Storage Capabilities

Each provider advertises capabilities:

```text
supports_multipart_upload
supports_presigned_upload
supports_presigned_download
supports_range_read
supports_server_side_encryption
supports_object_lock
supports_tags
supports_metadata
supports_checksum_sha256
supports_checksum_crc32c
supports_copy_object
supports_lifecycle
max_single_put_bytes
min_part_bytes
max_part_count
default_presign_ttl_seconds
```

Business services must check capabilities before selecting upload and download strategies.

### 9.4 S3-Compatible Standard

The first production adapter is `sdkwork-drive-storage-s3`.

It must support:

- S3 endpoint URL configuration.
- Region.
- Bucket.
- Access key and secret key loaded from protected config.
- Optional session token.
- Path-style and virtual-hosted-style configuration.
- Optional TLS strict mode.
- Multipart upload.
- Presigned PUT/GET.
- Range reads.
- Object metadata.
- Object tags where available.
- Server-side encryption policy where configured.

S3 adapter configuration should not leak into API DTOs.

### 9.5 Object Key Strategy

Object keys are internal storage identifiers and must not be exposed as durable API facts.

Recommended key pattern:

```text
tenant/{tenant_id}/space/{space_uuid}/node/{node_uuid}/version/{version_uuid}/object
tenant/{tenant_id}/tmp/upload/{upload_session_uuid}/part/{part_no}
tenant/{tenant_id}/derived/preview/{node_uuid}/{variant_uuid}
```

Rules:

- Object key is generated by backend.
- User filename is stored in metadata, not trusted as object key.
- Raw object key is never returned to browser/app clients.
- Presigned URL TTL is short and generated after permission checks.
- Temporary upload keys are swept if upload session expires.

### 9.6 Storage Records

`dr_drive_storage_object` is the database fact for physical bytes. It records provider identity, bucket, object key, size, checksums, encryption reference, storage class, and lifecycle status.

The object store is not the source of business metadata. The database is the source of truth for drive metadata, permissions, versions, and lifecycle state.

### 9.7 Upload Flow

1. Client requests an upload session.
2. Service validates actor, target space, quota, file constraints, and idempotency.
3. Service creates `dr_drive_upload_session`.
4. Service asks `DriveObjectStore` for multipart state or direct upload strategy.
5. Client uploads parts through presigned URLs or server-proxied streams.
6. Client completes upload.
7. Service verifies size, checksum, parts, quota reservation, and upload state.
8. Service commits `dr_drive_storage_object`, `drive_file_version`, `dr_drive_node`, `dr_drive_change_log`, `dr_drive_audit_event`.
9. Service emits scan, preview, search, and ingestion events as needed.

### 9.8 Download Flow

1. Client requests download URL or stream.
2. Service checks actor, resource, version, share link, retention, and policy.
3. Service generates short-lived download ticket.
4. Service either streams bytes through backend or returns a short-lived presigned URL.
5. Download emits safe audit and metrics events.

Presigned URLs are transport artifacts, not durable API facts.

## 10. Database Design

### 10.1 Global Rules

All core tables:

- Use lowercase snake_case names.
- Use business prefix `drive_`.
- Include `id` for internal references.
- Include `uuid` for public references.
- Include `tenant_id` for tenant-owned data.
- Include `created_at`, `updated_at`, and `version` unless explicitly documented.
- Use soft delete for user-visible lifecycle.
- Use status columns for explicit state transitions.
- Avoid putting tenant, permission, status, amount, idempotency, or lifecycle facts only inside JSON.

### 10.2 Tables

#### dr_drive_space

Purpose: top-level storage space.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
organization_id BIGINT
owner_type VARCHAR(32) NOT NULL
owner_id BIGINT NOT NULL
space_type VARCHAR(32) NOT NULL
name VARCHAR(255) NOT NULL
normalized_name VARCHAR(255) NOT NULL
visibility VARCHAR(32) NOT NULL
purpose_code VARCHAR(64)
quota_policy_id BIGINT
retention_policy_id BIGINT
default_permission_mode VARCHAR(32) NOT NULL
root_node_id BIGINT
metadata_schema_version INTEGER NOT NULL
metadata JSONB/TEXT
status VARCHAR(32) NOT NULL
created_by BIGINT
updated_by BIGINT
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
deleted_at TIMESTAMP
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_space_uuid`
- `idx_dr_drive_space_tenant_type_status`
- `idx_dr_drive_space_tenant_owner`

#### dr_drive_space_knowledge_profile

Purpose: knowledge-base-specific space settings.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
knowledge_base_id BIGINT NOT NULL
ingestion_mode VARCHAR(32) NOT NULL
chunk_policy_code VARCHAR(64)
embedding_profile_id BIGINT
index_status VARCHAR(32) NOT NULL
source_sync_mode VARCHAR(32) NOT NULL
last_ingested_at TIMESTAMP
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_space_knowledge_profile_space`
- `idx_dr_drive_space_knowledge_profile_kb`

#### dr_drive_space_ai_generation_profile

Purpose: AI-generated asset space settings.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
source_app_id BIGINT
generation_scope VARCHAR(32) NOT NULL
provenance_required BOOLEAN NOT NULL
default_retention_days INTEGER
prompt_storage_policy VARCHAR(32) NOT NULL
model_metadata_policy VARCHAR(32) NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_space_ai_generation_profile_space`
- `idx_dr_drive_space_ai_generation_profile_app`

#### dr_drive_space_app_upload_profile

Purpose: app-scoped upload and attachment space settings.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
app_id BIGINT NOT NULL
upload_scope VARCHAR(32) NOT NULL
resource_type VARCHAR(128)
allowed_mime_types JSONB/TEXT
max_object_bytes BIGINT
retention_mode VARCHAR(32) NOT NULL
promote_policy VARCHAR(32) NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_space_app_upload_profile_space`
- `idx_dr_drive_space_app_upload_profile_app`

#### dr_drive_node

Purpose: file, folder, shortcut, or reference.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
organization_id BIGINT
space_id BIGINT NOT NULL
parent_id BIGINT
owner_user_id BIGINT
node_type VARCHAR(32) NOT NULL
name VARCHAR(255) NOT NULL
normalized_name VARCHAR(255) NOT NULL
mime_type VARCHAR(255)
extension VARCHAR(64)
size_bytes BIGINT NOT NULL DEFAULT 0
current_version_id BIGINT
storage_object_id BIGINT
shortcut_target_node_id BIGINT
path_key VARCHAR(2048) NOT NULL
depth INTEGER NOT NULL
sort_order BIGINT NOT NULL DEFAULT 0
starred BOOLEAN NOT NULL DEFAULT FALSE
pinned BOOLEAN NOT NULL DEFAULT FALSE
status VARCHAR(32) NOT NULL
trashed_at TIMESTAMP
deleted_at TIMESTAMP
deleted_by BIGINT
created_by BIGINT
updated_by BIGINT
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `idx_dr_drive_node_tenant_space_parent_status_name`
- `idx_dr_drive_node_tenant_space_updated`
- `idx_dr_drive_node_tenant_owner_updated`
- live sibling unique key on `(tenant_id, space_id, parent_id, normalized_name)` where not deleted and not trashed.

#### drive_file_version

Purpose: immutable file content version.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
node_id BIGINT NOT NULL
version_no BIGINT NOT NULL
storage_object_id BIGINT NOT NULL
size_bytes BIGINT NOT NULL
checksum_sha256 VARCHAR(128)
content_hash VARCHAR(128)
mime_type VARCHAR(255)
created_by BIGINT
created_at TIMESTAMP NOT NULL
status VARCHAR(32) NOT NULL
retained_until TIMESTAMP
metadata_schema_version INTEGER NOT NULL
metadata JSONB/TEXT
```

Indexes:

- `uk_drive_file_version_node_version_no`
- `idx_drive_file_version_tenant_node_created`

#### dr_drive_storage_object

Purpose: durable object-storage reference.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
provider_id BIGINT NOT NULL
provider_kind VARCHAR(32) NOT NULL
bucket VARCHAR(255) NOT NULL
object_key VARCHAR(2048) NOT NULL
object_version_id VARCHAR(255)
storage_class VARCHAR(64)
size_bytes BIGINT NOT NULL
checksum_sha256 VARCHAR(128)
checksum_crc32c VARCHAR(128)
etag VARCHAR(255)
encryption_mode VARCHAR(64)
encryption_key_ref VARCHAR(255)
retain_until TIMESTAMP
status VARCHAR(32) NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
deleted_at TIMESTAMP
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_storage_object_provider_key`
- `idx_dr_drive_storage_object_tenant_hash_size`
- `idx_dr_drive_storage_object_tenant_status_updated`

#### dr_drive_storage_provider

Purpose: configured storage backend.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT
provider_kind VARCHAR(32) NOT NULL
name VARCHAR(128) NOT NULL
endpoint_url VARCHAR(512)
region VARCHAR(128)
bucket VARCHAR(255) NOT NULL
path_style BOOLEAN NOT NULL
credential_ref VARCHAR(255) NOT NULL
server_side_encryption_mode VARCHAR(64)
default_storage_class VARCHAR(64)
status VARCHAR(32) NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Credentials are stored outside this table through secret references. Raw keys are never persisted here.

#### dr_drive_upload_session

Purpose: resumable upload state.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
parent_id BIGINT
target_node_id BIGINT
target_name VARCHAR(255) NOT NULL
normalized_target_name VARCHAR(255) NOT NULL
expected_size_bytes BIGINT
received_size_bytes BIGINT NOT NULL DEFAULT 0
mime_type VARCHAR(255)
upload_mode VARCHAR(32) NOT NULL
object_key VARCHAR(2048) NOT NULL
provider_upload_id VARCHAR(512)
idempotency_key VARCHAR(255)
state VARCHAR(32) NOT NULL
expires_at TIMESTAMP NOT NULL
created_by BIGINT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
completed_at TIMESTAMP
aborted_at TIMESTAMP
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_upload_session_uuid`
- `uk_dr_drive_upload_session_idempotency`
- `idx_dr_drive_upload_session_tenant_state_expires`

#### drive_upload_part

Purpose: multipart upload part facts.

Key columns:

```text
id BIGINT PRIMARY KEY
tenant_id BIGINT NOT NULL
upload_session_id BIGINT NOT NULL
part_no INTEGER NOT NULL
size_bytes BIGINT NOT NULL
checksum_sha256 VARCHAR(128)
etag VARCHAR(255)
uploaded_at TIMESTAMP NOT NULL
status VARCHAR(32) NOT NULL
```

Indexes:

- `uk_drive_upload_part_session_part`

#### dr_drive_node_permission

Purpose: ACL facts.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
resource_type VARCHAR(32) NOT NULL
resource_id BIGINT NOT NULL
subject_type VARCHAR(32) NOT NULL
subject_id BIGINT
role VARCHAR(32) NOT NULL
inherited_from_id BIGINT
expires_at TIMESTAMP
status VARCHAR(32) NOT NULL
created_by BIGINT
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `idx_dr_drive_node_permission_resource`
- `idx_dr_drive_node_permission_subject`

#### dr_drive_node_share_link

Purpose: share link facts.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
resource_type VARCHAR(32) NOT NULL
resource_id BIGINT NOT NULL
token_hash VARCHAR(255) NOT NULL
role VARCHAR(32) NOT NULL
access_scope VARCHAR(32) NOT NULL
password_hash VARCHAR(255)
expires_at TIMESTAMP
download_limit BIGINT
download_count BIGINT NOT NULL DEFAULT 0
revoked_at TIMESTAMP
created_by BIGINT NOT NULL
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `uk_dr_drive_node_share_link_token_hash`
- `idx_dr_drive_node_share_link_resource`

#### dr_drive_change_log

Purpose: delta sync and event projection.

Key columns:

```text
id BIGINT PRIMARY KEY
tenant_id BIGINT NOT NULL
space_id BIGINT NOT NULL
sequence_id BIGINT NOT NULL
resource_type VARCHAR(32) NOT NULL
resource_id BIGINT NOT NULL
event_type VARCHAR(64) NOT NULL
actor_user_id BIGINT
request_id VARCHAR(64)
trace_id VARCHAR(128)
changed_at TIMESTAMP NOT NULL
metadata_schema_version INTEGER NOT NULL
metadata JSONB/TEXT
```

Indexes:

- `uk_dr_drive_change_log_space_sequence`
- `idx_dr_drive_change_log_resource`

#### drive_quota_usage

Purpose: quota reservation and committed usage.

Key columns:

```text
id BIGINT PRIMARY KEY
tenant_id BIGINT NOT NULL
scope_type VARCHAR(32) NOT NULL
scope_id BIGINT NOT NULL
used_bytes BIGINT NOT NULL
reserved_bytes BIGINT NOT NULL
file_count BIGINT NOT NULL
version_count BIGINT NOT NULL
updated_at TIMESTAMP NOT NULL
version BIGINT NOT NULL
```

Indexes:

- `uk_drive_quota_usage_scope`

#### dr_drive_audit_event

Purpose: append-oriented audit.

Key columns:

```text
id BIGINT PRIMARY KEY
uuid VARCHAR(64) NOT NULL UNIQUE
tenant_id BIGINT NOT NULL
actor_user_id BIGINT
actor_type VARCHAR(32) NOT NULL
action VARCHAR(128) NOT NULL
resource_type VARCHAR(32) NOT NULL
resource_id BIGINT
result VARCHAR(32) NOT NULL
request_id VARCHAR(64)
trace_id VARCHAR(128)
ip_hash VARCHAR(128)
user_agent_hash VARCHAR(128)
created_at TIMESTAMP NOT NULL
metadata_schema_version INTEGER NOT NULL
metadata JSONB/TEXT
```

Indexes:

- `idx_dr_drive_audit_event_tenant_created`
- `idx_dr_drive_audit_event_resource`

## 11. Service Design

### 11.1 Public Facades

```text
DriveSpaceService
DriveKnowledgeSpaceService
DriveAiGeneratedSpaceService
DriveAppUploadSpaceService
DriveNodeService
DriveUploadService
DriveDownloadService
DriveVersionService
DrivePermissionService
DriveShareService
DriveTrashService
DriveChangeService
DriveQuotaService
DriveAuditService
DriveSearchService
```

### 11.2 Persistence Ports

```text
DriveSpaceStore
DriveNodeStore
DriveVersionStore
DriveStorageObjectStore
DriveStorageProviderStore
DriveUploadSessionStore
DrivePermissionStore
DriveShareLinkStore
DriveChangeLogStore
DriveQuotaStore
DriveAuditSink
```

### 11.3 Integration Ports

```text
DriveObjectStore
DriveVirusScanPort
DrivePreviewJobPort
DriveSearchIndexPort
DriveKnowledgeIngestionPort
DriveAiGenerationProvenancePort
DriveAppAuthorizationPort
```

### 11.4 Service Rules

- API handlers do not contain business rules beyond transport validation and mapping.
- Application services own transactions, permission checks, quota checks, state transitions, and audit emission.
- Domain models own invariants and transition legality.
- SQL stores do not decide permissions.
- Object store adapters do not decide business identity or file visibility.
- Component consumers call service facades or mount routers; they do not call SQL stores directly.

## 12. API Design

### 12.1 App API

All app APIs use `/app/v3/api`.

Representative routes:

```text
GET    /app/v3/api/drive/spaces
POST   /app/v3/api/drive/spaces
GET    /app/v3/api/drive/spaces/{space_id}/nodes
POST   /app/v3/api/drive/nodes/folders
GET    /app/v3/api/drive/nodes/{node_id}
PATCH  /app/v3/api/drive/nodes/{node_id}
POST   /app/v3/api/drive/nodes/{node_id}/move
POST   /app/v3/api/drive/nodes/{node_id}/copy
DELETE /app/v3/api/drive/nodes/{node_id}
POST   /app/v3/api/drive/trash/{node_id}/restore
POST   /app/v3/api/drive/upload_sessions
PUT    /app/v3/api/drive/upload_sessions/{upload_session_id}/parts/{part_no}
POST   /app/v3/api/drive/upload_sessions/{upload_session_id}/complete
POST   /app/v3/api/drive/upload_sessions/{upload_session_id}/abort
GET    /app/v3/api/drive/nodes/{node_id}/download_url
GET    /app/v3/api/drive/nodes/{node_id}/versions
POST   /app/v3/api/drive/nodes/{node_id}/versions/{version_id}/restore
GET    /app/v3/api/drive/nodes/{node_id}/permissions
POST   /app/v3/api/drive/nodes/{node_id}/permissions
DELETE /app/v3/api/drive/nodes/{node_id}/permissions/{permission_id}
POST   /app/v3/api/drive/nodes/{node_id}/share_links
DELETE /app/v3/api/drive/share_links/{share_link_id}
GET    /app/v3/api/drive/changes
GET    /app/v3/api/drive/search
```

Special spaces:

```text
POST /app/v3/api/drive/knowledge_spaces/{knowledge_base_id}/upload_sessions
GET  /app/v3/api/drive/knowledge_spaces/{knowledge_base_id}/nodes
GET  /app/v3/api/drive/ai_generated_spaces/assets
POST /app/v3/api/drive/ai_generated_spaces/assets/{asset_id}/save_to_drive
POST /app/v3/api/drive/app_upload_spaces/{app_id}/upload_sessions
POST /app/v3/api/drive/app_upload_spaces/uploads/{upload_id}/promote
```

### 12.2 Backend API

All backend APIs use `/backend/v3/api`.

Representative routes:

```text
GET    /backend/v3/api/drive/spaces
POST   /backend/v3/api/drive/spaces
GET    /backend/v3/api/drive/audit_events
GET    /backend/v3/api/drive/quota_usages
GET    /backend/v3/api/drive/storage_providers
POST   /backend/v3/api/drive/storage_providers
PATCH  /backend/v3/api/drive/storage_providers/{provider_id}
POST   /backend/v3/api/drive/storage_providers/{provider_id}/test
GET    /backend/v3/api/drive/upload_sessions
POST   /backend/v3/api/drive/knowledge_spaces
PATCH  /backend/v3/api/drive/knowledge_spaces/{space_id}/indexing_policy
POST   /backend/v3/api/drive/ai_generated_spaces
POST   /backend/v3/api/drive/app_upload_spaces
PATCH  /backend/v3/api/drive/app_upload_spaces/{space_id}/retention_policy
POST   /backend/v3/api/drive/maintenance/object_sweep
POST   /backend/v3/api/drive/maintenance/upload_session_sweep
```

### 12.3 OperationId Standard

OpenAPI `operationId` uses dotted resource style:

```text
spaces.list
spaces.create
nodes.retrieve
nodes.update
nodes.move
uploadSessions.create
uploadSessions.parts.upload
uploadSessions.complete
knowledgeSpaces.uploadSessions.create
aiGeneratedSpaces.assets.saveToDrive
appUploadSpaces.uploadSessions.create
storageProviders.test
maintenance.objectSweep.start
```

Generated SDK shape should be resource-oriented:

```ts
client.drive.spaces.list(params)
client.drive.nodes.retrieve(nodeId)
client.drive.uploadSessions.create(body)
client.drive.uploadSessions.parts.upload(uploadSessionId, partNo, body)
client.drive.knowledgeSpaces.uploadSessions.create(knowledgeBaseId, body)
client.drive.aiGeneratedSpaces.assets.saveToDrive(assetId, body)
client.drive.appUploadSpaces.uploadSessions.create(appId, body)
client.drive.storageProviders.test(providerId)
```

## 13. SDK Generation

SDK families:

```text
sdks/sdkwork-drive-app-sdk/
sdks/sdkwork-drive-backend-sdk/
```

Each SDK family contains:

```text
openapi/
  sdkwork-drive-app-api.openapi.json
  sdkwork-drive-app-api.sdkgen.json
sdkwork-drive-app-sdk-typescript/
sdkwork-drive-app-sdk-rust/
sdkwork-drive-app-sdk-java/
sdkwork-drive-app-sdk-python/
sdkwork-drive-app-sdk-go/
...
bin/
  generate-sdk.mjs
  verify-sdk.mjs
.sdkwork-assembly.json
```

Generation rules:

- OpenAPI is the source of truth.
- Generated SDK output must not be hand-edited.
- Use `--standard-profile sdkwork-v3`.
- App SDK and backend SDK are separate packages.
- SDK clients handle auth headers in SDK/bootstrap infrastructure.
- No raw HTTP fallback for missing methods.
- Problem details map to SDK error metadata.

## 14. Security Design

### 14.1 Authentication

Protected HTTP APIs require SDKWork auth context:

- `Authorization: Bearer <auth_token>`
- `Access-Token: <access_token>`

Machine or internal flows must be explicitly documented and permission-scoped.

### 14.2 Authorization

Authorization checks include:

- tenant context
- organization context
- actor user
- app identity where applicable
- space type
- space membership
- node ownership
- inherited permissions
- direct ACL
- share link policy
- app resource permission for `app_upload`
- knowledge-base ACL for `knowledge_base`
- generation actor/source app for `ai_generated`

Frontend checks are user-experience hints only.

### 14.3 Object Security

- Raw storage object keys are internal.
- Presigned upload/download URLs have short TTL.
- Share link token stores only hash.
- Upload session token binds actor, resource, and expiry.
- Storage credentials are secret references, not table plaintext.
- Sensitive metadata is classified and masked.
- Prompt text is not stored in ordinary metadata by default.
- Audit logs must not contain raw tokens, credentials, object keys, or full private payloads.

### 14.4 Upload Safety

Upload APIs must define:

- max size
- MIME policy
- extension policy
- checksum policy
- quota reservation
- scan status
- retention mode
- app/knowledge/AI special-space policy

Virus scanning can start as a port and no-op adapter, but the state model must be present.

## 15. Performance Design

Performance class:

- Folder list: P1.
- Download URL creation: P0/P1 depending on deployment.
- Upload session creation: P1.
- Search: P1/P2 depending on backend.
- Preview generation: P2 async.
- Object sweep: P3 maintenance.

Rules:

- File bytes are never stored in PostgreSQL rows.
- Folder list queries use indexed `(tenant_id, space_id, parent_id, status, normalized_name)`.
- Search never performs unbounded table scans.
- Downloads are streaming or presigned.
- Range reads are supported when provider capability exists.
- Large files use multipart upload.
- Quota reservation is transactional.
- Permission cache is optional and must be invalidated on ACL changes.
- Change log supports cursor-based delta sync.
- Background jobs handle preview, indexing, scanning, and sweep.

## 16. Observability And Audit

Every request has a server-generated request id. Logs and traces include safe fields:

```text
service
environment
operationId
route
status
duration
tenant_id
space_id
resource_type
request_id
trace_id
```

Audit events are emitted for:

- space creation/update/delete
- upload start/complete/abort
- download URL creation
- permission create/update/delete
- share link create/revoke
- file delete/restore
- version restore
- app upload promotion
- knowledge ingestion state change
- AI generated asset save-to-drive
- storage provider create/update/test
- maintenance sweep

## 17. Error And Idempotency

Errors use `application/problem+json`.

Standard error fields:

```text
type
title
status
detail
code
traceId
requestId
fieldErrors
retryable
```

Idempotency:

- `POST /upload_sessions` supports `Idempotency-Key`.
- Create-folder can support `Idempotency-Key`.
- Copy/move/restore commands should support idempotency where retryable.
- Duplicate idempotency key with different payload returns `409`.
- Client must not provide `requestId`.

## 18. Testing Strategy

Test layers:

- Domain unit tests for invariants and state transitions.
- Application tests with fake ports.
- SQLx SQLite tests for fast local coverage.
- PostgreSQL contract tests for indexes, constraints, JSON mapping, partial uniqueness, and transaction behavior.
- Object store tests with local fake adapter.
- S3/MinIO integration tests for multipart, presign, range, metadata, and cleanup.
- API contract tests for app and backend routes.
- OpenAPI validation tests.
- SDK generation smoke tests.
- Security tests for ACL, share token hash, object key non-exposure, and sensitive log redaction.
- Performance smoke tests for folder list, upload session, and download URL creation.

## 19. Delivery Sequence

1. Create Rust workspace structure.
2. Create schema registry table definitions.
3. Create OpenAPI contract skeleton for app/backend APIs.
4. Create SDK generation folders and manifests.
5. Implement core domain models and ports.
6. Implement SQLx schema installation and stores.
7. Implement local object store adapter.
8. Implement S3-compatible object store adapter.
9. Implement upload session flow.
10. Implement node, version, trash, permission, share, quota, and change-log services.
11. Implement app API routers.
12. Implement backend API routers.
13. Generate SDKs.
14. Add verification gates.

## 20. Open Decisions

Recommended defaults unless changed before implementation:

- PostgreSQL is the production database.
- SQLite remains supported for local and test mode.
- S3/MinIO is the first production storage adapter.
- `shared_with_me` is a virtual view, not a `space_type`.
- Prompt plaintext is not retained in ordinary drive metadata.
- App upload files are hidden from normal drive home until promoted.
- Knowledge-base ingestion/vector indexing is modeled in phase 1, with concrete vector store integration allowed in phase 2.

## 21. Acceptance Criteria For This Design

- Backend-only scope is explicit.
- Project structure follows `sdkwork-claw-router` workspace style.
- Database table prefix and table shape follow SDKWork database standard.
- Space types include `personal`, `team`, `knowledge_base`, `ai_generated`, `app`, and `app_upload`.
- S3-compatible storage is supported through a compact provider-agnostic abstraction.
- Future object stores can be added without changing application services.
- App/backend API paths follow `/app/v3/api` and `/backend/v3/api`.
- OperationIds support resource-style generated SDK clients.
- Component-style Rust import is supported through service facades and router builders.
- Security, performance, observability, audit, idempotency, and test strategy are defined before implementation.
