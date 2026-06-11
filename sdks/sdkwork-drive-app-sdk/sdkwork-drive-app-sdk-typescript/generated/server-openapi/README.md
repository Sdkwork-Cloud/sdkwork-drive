# sdkwork-drive-app-sdk

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
npm install sdkwork-drive-app-sdk-generated-typescript
# or
yarn add sdkwork-drive-app-sdk-generated-typescript
# or
pnpm add sdkwork-drive-app-sdk-generated-typescript
```

## Quick Start

```typescript
import { SdkworkAppClient } from 'sdkwork-drive-app-sdk-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000,
});

// Authentication
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
const params = {
  tenantId: 'tenantId',
};
const result = await client.drive.quotas.summary(params);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```typescript
import { SdkworkAppClient } from 'sdkwork-drive-app-sdk-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.drive` - drive API
- `client.nodeLabels` - node_labels API
- `client.nodeProperties` - node_properties API
- `client.nodes` - nodes API
- `client.watchChannels` - watch_channels API
- `client.assets` - assets API

## Usage Examples

### drive

```typescript
// GET /app/v3/api/drive/quotas/summary
const params = {
  tenantId: 'tenantId',
};
const result = await client.drive.quotas.summary(params);
```

### node_labels

```typescript
// List labels applied to a node
const nodeId = '1';
const params = {
  tenantId: 'tenantId',
  labelKey: 'labelKey',
  pageSize: 3,
  pageToken: 'pageToken',
};
const result = await client.nodeLabels.list(nodeId, params);
```

### node_properties

```typescript
// List node custom properties
const nodeId = '1';
const params = {
  tenantId: 'tenantId',
  visibility: 'private',
  pageSize: 3,
  pageToken: 'pageToken',
};
const result = await client.nodeProperties.list(nodeId, params);
```

### nodes

```typescript
// Create a shortcut node
const body = {
  id: 'id',
  tenantId: 'tenantId',
  spaceId: 'spaceId',
  parentNodeId: 'parentNodeId',
  nodeName: 'nodeName',
  targetNodeId: 'targetNodeId',
  operatorId: 'operatorId',
};
const result = await client.nodes.shortcuts.create(body);
```

### watch_channels

```typescript
// List Drive watch channels
const params = {
  tenantId: 'tenantId',
  resourceType: 'changes',
  lifecycleStatus: 'active',
  pageSize: 4,
  pageToken: 'pageToken',
};
const result = await client.watchChannels.list(params);
```

### assets

```typescript
// List asset collections
const params = {
  tenantId: 'tenantId',
  cursor: 'cursor',
  pageSize: 3,
};
const result = await client.assets.assetCollections.list(params);
```

## Error Handling

```typescript
import { SdkworkAppClient, NetworkError, TimeoutError, AuthenticationError } from 'sdkwork-drive-app-sdk-generated-typescript';

try {
  const params = {
    tenantId: 'tenantId',
  };
  const result = await client.drive.quotas.summary(params);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
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

> Configure npm registry credentials before release publish.

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
