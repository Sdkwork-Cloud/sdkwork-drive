# sdkwork-drive-backend-sdk (Rust)

Professional Rust SDK for SDKWork API.

## Installation

```bash
cargo add sdkwork-drive-backend-sdk-generated-rust
```

## Quick Start

```rust
use sdkwork_drive_backend_sdk_generated_rust::{SdkworkBackendClient, SdkworkConfig};
use std::collections::HashMap;


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
    client.set_api_key("your-api-key");

    let mut query = HashMap::new();
    query.insert("status".to_string(), serde_json::json!("status"));
    let result = client.drive().storage_providers_list(Some(&query)).await?;
    println!("{result:?}");
    Ok(())
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```rust
let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_api_key("your-api-key");
// Sends: Access-Token: <apiKey>
```

### Mode B: Dual Token

```rust
let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `set_api_key(...)` together with `set_auth_token(...)` + `set_access_token(...)` on the same client.

## Configuration (Non-Auth)

```rust
let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.drive()` - drive API
- `client.labels()` - labels API

## Usage Examples

### drive

```rust
use std::collections::HashMap;
// GET /backend/v3/api/drive/storage_providers
let mut query = HashMap::new();
query.insert("status".to_string(), serde_json::json!("status"));
let result = client.drive().storage_providers_list(Some(&query)).await?;
println!("{result:?}");
```

### labels

```rust
use std::collections::HashMap;
// List Drive label definitions
let mut query = HashMap::new();
query.insert("tenantId".to_string(), serde_json::json!("1"));
query.insert("lifecycleStatus".to_string(), serde_json::json!("active"));
query.insert("pageSize".to_string(), serde_json::json!(3));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.labels().list(Some(&query)).await?;
println!("{result:?}");
```

## Error Handling

```rust
use sdkwork_drive_backend_sdk_generated_rust::{SdkworkBackendClient, SdkworkConfig};
use std::collections::HashMap;


let client = SdkworkBackendClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;

let outcome: Result<(), _> = async {
    let mut query = HashMap::new();
    query.insert("status".to_string(), serde_json::json!("status"));
    client.drive().storage_providers_list(Some(&query)).await?;
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

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
