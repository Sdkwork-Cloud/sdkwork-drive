# sdkwork-drive-app-sdk (Go)

Professional Go SDK for SDKWork API.

## Installation

```bash
go get sdkwork-drive-app-sdk-generated-go
```

## Quick Start

```go
package main

import (
    "fmt"
    "sdkwork-drive-app-sdk-generated-go"
    sdkhttp "sdkwork-drive-app-sdk-generated-go/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
    client := sdkwork-drive-app-sdk-generated-go.NewSdkworkAppClientWithConfig(cfg)
    client.SetApiKey("your-api-key")
    
    // Use the SDK
    params := map[string]interface{}{
        "tenantId": "tenantId",
    }
    result, err := client.Drive.QuotasSummary(params)
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
client := sdkwork-drive-app-sdk-generated-go.NewSdkworkAppClientWithConfig(cfg)
client.SetApiKey("your-api-key")
// Sends: Access-Token: <apiKey>
```

### Mode B: Dual Token

```go
cfg := sdkhttp.NewDefaultConfig("http://127.0.0.1:18080")
client := sdkwork-drive-app-sdk-generated-go.NewSdkworkAppClientWithConfig(cfg)
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
client := sdkwork-drive-app-sdk-generated-go.NewSdkworkAppClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.Drive` - drive API
- `client.NodeLabels` - node_labels API
- `client.NodeProperties` - node_properties API
- `client.Nodes` - nodes API
- `client.WatchChannels` - watch_channels API

## Usage Examples

### drive

```go
// GET /app/v3/api/drive/quotas/summary
params := map[string]interface{}{
    "tenantId": "tenantId",
}
result, err := client.Drive.QuotasSummary(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### node_labels

```go
// List labels applied to a node
nodeId := "1"
params := map[string]interface{}{
    "tenantId": "tenantId",
    "labelKey": "labelKey",
    "pageSize": 3,
    "pageToken": "pageToken",
}
result, err := client.NodeLabels.List(nodeId, params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### node_properties

```go
// List node custom properties
nodeId := "1"
params := map[string]interface{}{
    "tenantId": "tenantId",
    "visibility": "private",
    "pageSize": 3,
    "pageToken": "pageToken",
}
result, err := client.NodeProperties.List(nodeId, params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### nodes

```go
// Create a shortcut node
body := sdktypes.CreateShortcutRequest{
    Id: "id",
    TenantId: "tenantId",
    SpaceId: "spaceId",
    ParentNodeId: "parentNodeId",
    NodeName: "nodeName",
    TargetNodeId: "targetNodeId",
    OperatorId: "operatorId",
}
result, err := client.Nodes.ShortcutsCreate(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### watch_channels

```go
// List Drive watch channels
params := map[string]interface{}{
    "tenantId": "tenantId",
    "resourceType": "changes",
    "lifecycleStatus": "active",
    "pageSize": 4,
    "pageToken": "pageToken",
}
result, err := client.WatchChannels.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

## Error Handling

```go
params := map[string]interface{}{
    "tenantId": "tenantId",
}
_, err := client.Drive.QuotasSummary(params)
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
