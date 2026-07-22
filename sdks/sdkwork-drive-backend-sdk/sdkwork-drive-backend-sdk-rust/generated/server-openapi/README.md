# sdkwork-drive-backend-sdk (Rust)

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
cargo add sdkwork-drive-backend-sdk-generated-rust
```

## Quick Start

```rust
use sdkwork_drive_backend_sdk_generated_rust::{SdkworkBackendClient, SdkworkConfig};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
    client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");

    let result = client.drive().quotas_retrieve().await?;
    println!("{result:?}");
    Ok(())
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```rust
let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.drive()` - drive API
- `client.labels()` - labels API
- `client.sandbox_volumes()` - sandbox_volumes API
- `client.sandbox_grants()` - sandbox_grants API

## Usage Examples

### drive

```rust
// GET /backend/v3/api/drive/quotas
let result = client.drive().quotas_retrieve().await?;
println!("{result:?}");
```

### labels

```rust
use std::collections::HashMap;
// List Drive label definitions
let mut query = HashMap::new();
query.insert("lifecycleStatus".to_string(), serde_json::json!("active"));
query.insert("page_size".to_string(), serde_json::json!(2));
query.insert("cursor".to_string(), serde_json::json!("cursor"));
let result = client.labels().list(Some(&query)).await?;
println!("{result:?}");
```

### sandbox_volumes

```rust
use std::collections::HashMap;
// List server sandbox volumes
let mut query = HashMap::new();
query.insert("lifecycle_status".to_string(), serde_json::json!("active"));
query.insert("provider_kind".to_string(), serde_json::json!("local_filesystem"));
query.insert("page".to_string(), serde_json::json!(3));
query.insert("page_size".to_string(), serde_json::json!(4));
let result = client.sandbox_volumes().list(Some(&query)).await?;
println!("{result:?}");
```

### sandbox_grants

```rust
use std::collections::HashMap;
// List explicit sandbox grants
let sandbox_id = "1";
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!(1));
query.insert("page_size".to_string(), serde_json::json!(2));
let result = client.sandbox_grants().list(sandbox_id, Some(&query)).await?;
println!("{result:?}");
```

## Error Handling

```rust
use sdkwork_drive_backend_sdk_generated_rust::{SdkworkBackendClient, SdkworkConfig};


let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;

let outcome: Result<(), _> = async {
    client.drive().quotas_retrieve().await?;
    Ok(())
}.await;

match outcome {
    Ok(()) => println!("request completed"),
    Err(error) => eprintln!("request failed: {error}"),
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Set cargo registry credentials before `cargo publish` and use `--dry-run` first.

## License

MIT

## Regeneration Contract

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.
