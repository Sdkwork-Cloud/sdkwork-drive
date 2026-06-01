# sdkwork-drive

Rust backend workspace for SDKWork Drive.

This repository is scaffolded for contract-first and TDD-first delivery.

## Backend Scope

- Rust modular backend services and reusable crates.
- App API and backend API OpenAPI contracts.
- SDK family generation skeleton (`sdks/drive-app-sdk`, `sdks/drive-backend-sdk`).
- S3-compatible object-storage abstraction with extension-ready provider boundary.

## Core Verification

```bash
cargo test -p sdkwork-drive-contract
cargo test -p sdkwork-drive-product
cargo test -p sdkwork-drive-app-api
cargo test -p sdkwork-drive-admin-api
```

## OpenAPI And SDK Tooling

Check contracts and schema quality without running SDK generation:

```bash
node tools/drive_sdk_generate.mjs --check
```

Check with explicit OpenAPI inputs (useful for CI workspace variants):

```bash
node tools/drive_sdk_generate.mjs --check \
  --app-input generated/openapi/drive-app-api.openapi.json \
  --backend-input generated/openapi/drive-backend-api.openapi.json
```

Run generation pipeline (requires `sdkwork-sdk-generator` on PATH, or configure `SDKWORK_SDK_GENERATOR_BIN`):

```bash
node tools/drive_sdk_generate.mjs
```

Generate selected language SDKs only (example: Rust):

```bash
node tools/drive_sdk_generate.mjs --language rust
```
