# sdkwork-drive-backend-sdk (Go)

Professional Go SDK for SDKWork API.

## Installation

```bash
go get sdkwork-drive-backend-sdk-generated-go
```

## Quick Start

```go
package main

import (
    "fmt"
    "sdkwork-drive-backend-sdk-generated-go"
    sdkhttp "sdkwork-drive-backend-sdk-generated-go/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
    client := sdkwork-drive-backend-sdk-generated-go.NewSdkworkBackendClientWithConfig(cfg)
    client.SetApiKey("your-api-key")
    
    // Use the SDK
    params := map[string]interface{}{
        "status": "status",
    }
    result, err := client.Drive.StorageProvidersList(params)
    if err != nil {
        panic(err)
    }
    fmt.Println(result)
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```go
cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
client := sdkwork-drive-backend-sdk-generated-go.NewSdkworkBackendClientWithConfig(cfg)
client.SetApiKey("your-api-key")
// Sends: Access-Token: <apiKey>
```

### Mode B: Dual Token

```go
cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
client := sdkwork-drive-backend-sdk-generated-go.NewSdkworkBackendClientWithConfig(cfg)
client.SetAuthToken("your-auth-token")
client.SetAccessToken("your-access-token")
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `SetApiKey(...)` together with `SetAuthToken(...)` + `SetAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```go
cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
client := sdkwork-drive-backend-sdk-generated-go.NewSdkworkBackendClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.Drive` - drive API
- `client.Labels` - labels API

## Usage Examples

### drive

```go
// GET /backend/v3/api/drive/storage_providers
params := map[string]interface{}{
    "status": "status",
}
result, err := client.Drive.StorageProvidersList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### labels

```go
// List Drive label definitions
params := map[string]interface{}{
    "tenantId": "tenantId",
    "lifecycleStatus": "active",
    "pageSize": 3,
    "pageToken": "pageToken",
}
result, err := client.Labels.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

## Error Handling

```go
params := map[string]interface{}{
    "status": "status",
}
_, err := client.Drive.StorageProvidersList(params)
if err != nil {
    // Handle error
    fmt.Println("Error:", err)
    return
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

> Set `GO_RELEASE_TAG` (or `SDKWORK_RELEASE_TAG`) and push tag if needed.

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
