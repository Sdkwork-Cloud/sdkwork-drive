# sdkwork-drive

Rust backend workspace for SDKWork Drive.

This repository is scaffolded for contract-first and TDD-first delivery.

## Backend Scope

- Rust modular backend services and reusable crates.
- App API, backend API, open API, and admin storage API OpenAPI contracts.
- SDK family generation skeleton (`sdks/sdkwork-drive-sdk`, `sdks/sdkwork-drive-app-sdk`, `sdks/sdkwork-drive-backend-sdk`, `sdks/sdkwork-drive-admin-storage-sdk`).
- S3-compatible object-storage abstraction with extension-ready provider boundary.
- PostgreSQL-first database configuration with SQLite local/private mode.

## Database Development Modes

```bash
pnpm dev          # PostgreSQL profile through .env.postgres
pnpm dev:sqlite   # SQLite local database at target/dev/sdkwork-drive.sqlite
pnpm server:plan:postgres
pnpm server:plan:sqlite
```

Database policy and current runtime boundaries are documented in
`docs/database-architecture.md`.

The local backend launch plan starts the four runtime API services together:

- App API: `sdkwork-drive-app-api` on `127.0.0.1:18080`.
- Backend API: `sdkwork-drive-backend-api` on `127.0.0.1:18081`.
- Open API: `sdkwork-drive-open-api` on `127.0.0.1:18082`.
- Admin storage API: `sdkwork-drive-admin-storage-api` on `127.0.0.1:18083`.

Runtime services also accept `SDKWORK_DRIVE_CONFIG_FILE` pointing at a TOML file
with a `[database]` section, for example `etc/drive.database.example.toml`.
`SDKWORK_DRIVE_DATABASE_URL` remains the highest-priority override.

## IAM Login Integration

Drive does not implement product-local login, refresh, logout, or current-session
routes. Login/session UX and transport are owned by SDKWork appbase; Drive
consumes the resulting SDKWork dual-token and AppContext projection.
Drive-specific standalone and embeddable IAM boundaries are documented in
`docs/drive-iam-integration-standard.md`.

Protected app, backend, and admin storage routes require:

- `Authorization: Bearer <authToken>`
- `Access-Token: <accessToken>`
- `x-sdkwork-tenant-id`
- `x-sdkwork-user-id`
- a signed `x-sdkwork-context-signature` in production

Local development through `pnpm dev` and `pnpm dev:sqlite` sets
`SDKWORK_DRIVE_IAM_ALLOW_UNSIGNED_CONTEXT=true` when no signature secret is
configured. Production deployments should omit that flag and set
`SDKWORK_DRIVE_IAM_CONTEXT_SIGNATURE_SECRET` so app, backend, and admin storage
services only accept trusted gateway AppContext projections. Open API share-link
routes and admin storage `/healthz` remain explicitly public and do not require
IAM headers.

When Drive is embedded into another application that already owns IAM, the host
must consume Drive packages in host-managed mode and must not mount the
standalone Drive app shell. The host owns `/auth/*`, refresh, logout, and appbase
runtime; Drive only consumes the host-provided SDKWork session projection.

## Core Verification

```bash
cargo test -p sdkwork-drive-contract
cargo test -p sdkwork-drive-product
cargo test -p sdkwork-drive-app-api
cargo test -p sdkwork-drive-backend-api
```

## OpenAPI And SDK Tooling

SDK family naming and app integration rules are documented in
`docs/drive-sdk-integration-standard.md`. The canonical SDK families are
`sdkwork-drive-sdk`, `sdkwork-drive-app-sdk`,
`sdkwork-drive-backend-sdk`, and `sdkwork-drive-admin-storage-sdk`.
API services and OpenAPI authority names still use
`sdkwork-drive-open-api`, `sdkwork-drive-app-api`, and
`sdkwork-drive-backend-api`; the dedicated storage administration module uses
`sdkwork-drive-admin-storage-api`.

Check contracts and schema quality without running SDK generation:

```bash
node tools/drive_sdk_generate.mjs --check
```

Check with explicit OpenAPI inputs (useful for CI workspace variants):

```bash
node tools/drive_sdk_generate.mjs --check \
  --app-input generated/openapi/drive-app-api.openapi.json \
  --backend-input generated/openapi/drive-backend-api.openapi.json \
  --admin-storage-input generated/openapi/drive-admin-storage-api.openapi.json
```

Run the generation pipeline after installing the native workspace dependencies.
By default Drive resolves the generator at
`../sdkwork-sdk-generator/bin/sdkgen.js`; `SDKWORK_SDK_GENERATOR_BIN`
is only for an explicit nonstandard local override and must still point at that
canonical generator checkout.

```bash
node tools/drive_sdk_generate.mjs
```

Generate selected language SDKs only (example: Rust):

```bash
node tools/drive_sdk_generate.mjs --language rust
```

## SDKWork Documentation Contract

Domain: drive
Capability: workspace
Package type: rust-crate
Status: standard

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm test`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
