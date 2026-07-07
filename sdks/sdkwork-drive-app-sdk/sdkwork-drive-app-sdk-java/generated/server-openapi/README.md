# sdkwork-drive-app-sdk (Java)

Generated SDKWork v3 dual-token transport SDK.

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sdkwork</groupId>
    <artifactId>sdkwork-drive-app-sdk-generated-java</artifactId>
    <version>0.1.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.sdkwork:sdkwork-drive-app-sdk-generated-java:0.1.0'
```

## Quick Start

```java
import com.sdkwork.drive.app.sdk.generated.java.SdkworkAppClient;
import com.sdkwork.common.core.Types;
import com.sdkwork.drive.app.sdk.generated.java.model.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Types.SdkConfig config = new Types.SdkConfig("http://127.0.0.1:18080");
        SdkworkAppClient client = new SdkworkAppClient(config);
        client.setAuthToken("your-auth-token");
client.setAccessToken("your-access-token");

        // Use the SDK
        QuotasRetrieveResponse result = client.getDrive().quotasRetrieve();
        System.out.println(result);
    }
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```java
Types.SdkConfig config = new Types.SdkConfig("http://127.0.0.1:18080");
SdkworkAppClient client = new SdkworkAppClient(config);

// Set custom headers
client.getHttpClient().setHeader("X-Custom-Header", "value");
```

## API Modules

- `client.getDrive()` - drive API
- `client.getNodeLabels()` - node_labels API
- `client.getNodeProperties()` - node_properties API
- `client.getNodes()` - nodes API
- `client.getWatchChannels()` - watch_channels API
- `client.getAssets()` - assets API

## Usage Examples

### drive

```java
// GET /app/v3/api/drive/quotas/summary
QuotasRetrieveResponse result = client.getDrive().quotasRetrieve();
System.out.println(result);
```

### node_labels

```java
// List labels applied to a node
String nodeId = "1";
Map<String, Object> params = new LinkedHashMap<>();
params.put("labelKey", "labelkey");
params.put("page_size", 2);
params.put("cursor", "cursor");
NodeLabelsListResponse result = client.getNodeLabels().list(nodeId, params);
System.out.println(result);
```

### node_properties

```java
// List node custom properties
String nodeId = "1";
Map<String, Object> params = new LinkedHashMap<>();
params.put("visibility", "private");
params.put("page_size", 2);
params.put("cursor", "cursor");
NodePropertiesListResponse result = client.getNodeProperties().list(nodeId, params);
System.out.println(result);
```

### nodes

```java
// Create a shortcut node
CreateShortcutRequest body = new CreateShortcutRequest();
body.setId("1");
body.setSpaceId("1");
body.setParentNodeId("1");
body.setNodeName("name");
body.setTargetNodeId("1");
NodesShortcutsCreateResponse201 result = client.getNodes().shortcutsCreate(body);
System.out.println(result);
```

### watch_channels

```java
// List Drive watch channels
Map<String, Object> params = new LinkedHashMap<>();
params.put("resourceType", "changes");
params.put("lifecycleStatus", "active");
params.put("page_size", 3);
params.put("cursor", "cursor");
WatchChannelsListResponse result = client.getWatchChannels().list(params);
System.out.println(result);
```

### assets

```java
// List asset collections
Map<String, Object> params = new LinkedHashMap<>();
params.put("cursor", "cursor");
params.put("page_size", 2);
AssetCollectionsListResponse result = client.getAssets().assetCollectionsList(params);
System.out.println(result);
```

## Error Handling

```java
try {
    QuotasRetrieveResponse result = client.getDrive().quotasRetrieve();
    System.out.println(result);
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
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

> Use Maven `settings.xml` credentials and optional `MAVEN_PUBLISH_PROFILE`.

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
