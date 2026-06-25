# sdkwork-drive-app-sdk (Rust)

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
cargo add sdkwork-drive-app-sdk-generated-rust
```

## Quick Start

```rust
use sdkwork_drive_app_sdk_generated_rust::{SdkworkAppClient, SdkworkConfig};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
    client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");

    let result = client.drive().quotas_summary().await?;
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
let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.drive()` - drive API
- `client.node_labels()` - node_labels API
- `client.node_properties()` - node_properties API
- `client.nodes()` - nodes API
- `client.watch_channels()` - watch_channels API
- `client.assets()` - assets API

## Usage Examples

### drive

```rust
// GET /app/v3/api/drive/quotas/summary
let result = client.drive().quotas_summary().await?;
println!("{result:?}");
```

### node_labels

```rust
use std::collections::HashMap;
// List labels applied to a node
let node_id = "1";
let mut query = HashMap::new();
query.insert("labelKey".to_string(), serde_json::json!("labelkey"));
query.insert("pageSize".to_string(), serde_json::json!(2));
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
query.insert("visibility".to_string(), serde_json::json!("private"));
query.insert("pageSize".to_string(), serde_json::json!(2));
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
    space_id: "1".to_string(),
    parent_node_id: Some("1".to_string()),
    node_name: "name".to_string(),
    target_node_id: "1".to_string(),
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
query.insert("resourceType".to_string(), serde_json::json!("changes"));
query.insert("lifecycleStatus".to_string(), serde_json::json!("active"));
query.insert("pageSize".to_string(), serde_json::json!(3));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.watch_channels().list(Some(&query)).await?;
println!("{result:?}");
```

### assets

```rust
use std::collections::HashMap;
// List asset collections
let mut query = HashMap::new();
query.insert("cursor".to_string(), serde_json::json!("cursor"));
query.insert("pageSize".to_string(), serde_json::json!(2));
let result = client.assets().asset_collections_list(Some(&query)).await?;
println!("{result:?}");
```

## Error Handling

```rust
use sdkwork_drive_app_sdk_generated_rust::{SdkworkAppClient, SdkworkConfig};


let client = SdkworkAppClient::new(SdkworkConfig::new("http://127.0.0.1:18080"))?;

let outcome: Result<(), _> = async {
    client.drive().quotas_summary().await?;
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
