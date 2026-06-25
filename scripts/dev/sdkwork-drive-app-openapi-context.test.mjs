import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertNoClientTenantQueryParams(openapi, label) {
  for (const [route, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!operation || typeof operation !== 'object' || !Array.isArray(operation.parameters)) {
        continue;
      }
      for (const parameter of operation.parameters) {
        const name = parameter?.name ?? '';
        const location = parameter?.in ?? '';
        assert.notEqual(
          location === 'query' && name === 'tenantId',
          true,
          `${label} ${method.toUpperCase()} ${route} must not accept client tenantId query params`,
        );
      }
    }
  }

  for (const [schemaName, schema] of Object.entries(openapi.components?.schemas ?? {})) {
    if (!schemaName.endsWith('Request')) {
      continue;
    }
    const properties = schema?.properties ?? {};
    assert.equal(
      properties.tenantId,
      undefined,
      `${label} request schema ${schemaName} must not expose client tenantId`,
    );
  }
}

const appOpenapi = readJson('apis/app-api/drive/drive-app-api.openapi.json');
assertNoClientTenantQueryParams(appOpenapi, 'drive app api');

const generatedDriveApi = readText(
  'sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/generated/server-openapi/src/api/drive.ts',
);
assert.doesNotMatch(
  generatedDriveApi,
  /\btenantId\b/u,
  'generated Drive TypeScript app SDK must not require client tenantId params',
);

const rustSourceOpenapi = readJson(
  'sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-rust/generated/server-openapi/source-openapi.json',
);
assertNoClientTenantQueryParams(rustSourceOpenapi, 'drive app sdk rust source openapi');

console.log('sdkwork-drive app OpenAPI context contract passed');
