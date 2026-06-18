# sdkwork-drive-app-sdk (Rust)

Professional Rust SDK for SDKWork API.

## Installation

```bash
cargo add sdkwork-drive-app-sdk-generated-rust
```

## Quick Start

```rust
use sdkwork_drive_app_sdk_generated_rust::{SdkworkAppClient, SdkworkConfig};
use std::collections::HashMap;


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
    client.set_api_key("your-api-key");

    let mut query = HashMap::new();
    query.insert("tenantId".to_string(), serde_json::json!("1"));
    let result = client.drive().quotas_summary(Some(&query)).await?;
    println!("{result:?}");
    Ok(())
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```rust
let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_api_key("your-api-key");
// Sends: Access-Token: <apiKey>
```

### Mode B: Dual Token

```rust
let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `set_api_key(...)` together with `set_auth_token(...)` + `set_access_token(...)` on the same client.

## Configuration (Non-Auth)

```rust
let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.drive()` - drive API
- `client.node_labels()` - node_labels API
- `client.node_properties()` - node_properties API
- `client.nodes()` - nodes API
- `client.watch_channels()` - watch_channels API

## Usage Examples

### drive

```rust
use std::collections::HashMap;
// GET /app/v3/api/drive/quotas/summary
let mut query = HashMap::new();
query.insert("tenantId".to_string(), serde_json::json!("1"));
let result = client.drive().quotas_summary(Some(&query)).await?;
println!("{result:?}");
```

### node_labels

```rust
use std::collections::HashMap;
// List labels applied to a node
let node_id = "1";
let mut query = HashMap::new();
query.insert("tenantId".to_string(), serde_json::json!("1"));
query.insert("labelKey".to_string(), serde_json::json!("labelkey"));
query.insert("pageSize".to_string(), serde_json::json!(3));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.node_labels().list(node_id, Some(&query)).await?;
println!("{result:?}");
```

### node_properties

```rust
use std::collections::HashMap;
// List node custom properties
let node_id = "1";
let mut query = HashMap::new();
query.insert("tenantId".to_string(), serde_json::json!("1"));
query.insert("visibility".to_string(), serde_json::json!("private"));
query.insert("pageSize".to_string(), serde_json::json!(3));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.node_properties().list(node_id, Some(&query)).await?;
println!("{result:?}");
```

### nodes

```rust
use sdkwork_drive_app_sdk_generated_rust::*;
// Create a shortcut node
let body = CreateShortcutRequest {
    id: "1".to_string(),
    tenant_id: "1".to_string(),
    space_id: "1".to_string(),
    parent_node_id: Some("1".to_string()),
    node_name: "name".to_string(),
    target_node_id: "1".to_string(),
    operator_id: "1".to_string(),
    ..Default::default()
};
let result = client.nodes().shortcuts_create(&body).await?;
println!("{result:?}");
```

### watch_channels

```rust
use std::collections::HashMap;
// List Drive watch channels
let mut query = HashMap::new();
query.insert("tenantId".to_string(), serde_json::json!("1"));
query.insert("resourceType".to_string(), serde_json::json!("changes"));
query.insert("lifecycleStatus".to_string(), serde_json::json!("active"));
query.insert("pageSize".to_string(), serde_json::json!(4));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.watch_channels().list(Some(&query)).await?;
println!("{result:?}");
```

## Error Handling

```rust
use sdkwork_drive_app_sdk_generated_rust::{SdkworkAppClient, SdkworkConfig};
use std::collections::HashMap;


let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;

let outcome: Result<(), _> = async {
    let mut query = HashMap::new();
    query.insert("tenantId".to_string(), serde_json::json!("1"));
    client.drive().quotas_summary(Some(&query)).await?;
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
