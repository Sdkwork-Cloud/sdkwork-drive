#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const warnings = [];

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} must exist`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function warn(condition, message) {
  if (!condition) {
    warnings.push(message);
  }
}

function assertDirectory(relativePath) {
  assert(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath}/ must exist`);
}

function assertCargoDependsOnWebFramework(relativeCrateToml) {
  const text = readText(relativeCrateToml);
  assert(
    text.includes('sdkwork-web-axum.workspace = true')
      || text.includes('sdkwork-web-axum = {'),
    `${relativeCrateToml} must depend on sdkwork-web-axum per WEB_FRAMEWORK_SPEC.md`,
  );
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertNoClientTenantIdInAppOpenapi(relativePath) {
  const openapi = readJson(relativePath);
  for (const [route, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!operation || typeof operation !== 'object' || !Array.isArray(operation.parameters)) {
        continue;
      }
      for (const parameter of operation.parameters) {
        assert(
          !(parameter?.in === 'query' && parameter?.name === 'tenantId'),
          `${relativePath} ${method.toUpperCase()} ${route} must not accept client tenantId query params`,
        );
      }
    }
  }

  for (const [schemaName, schema] of Object.entries(openapi.components?.schemas ?? {})) {
    if (!schemaName.endsWith('Request')) {
      continue;
    }
    assert(
      schema?.properties?.tenantId === undefined,
      `${relativePath} request schema ${schemaName} must not expose client tenantId`,
    );
  }
}

const requiredDirectories = [
  'apis',
  'apps',
  'crates',
  'sdks',
  'deployments',
  'configs',
  'scripts',
  'docs',
  'tests',
  '.sdkwork',
  'specs',
];

for (const directory of requiredDirectories) {
  assertDirectory(directory);
}

assert(fs.existsSync(path.join(repoRoot, 'sdkwork.app.config.json')), 'sdkwork.app.config.json must exist');
assert(fs.existsSync(path.join(repoRoot, 'sdkwork.workflow.json')), 'sdkwork.workflow.json must exist');
assert(
  fs.existsSync(path.join(repoRoot, '.github/workflows/package.yml')),
  '.github/workflows/package.yml must exist',
);

const cargoToml = readText('Cargo.toml');
assert(cargoToml.includes('sdkwork-database-config'), 'Cargo.toml must declare sdkwork-database-config');
assert(cargoToml.includes('sdkwork-database-sqlx'), 'Cargo.toml must declare sdkwork-database-sqlx');
assert(cargoToml.includes('sdkwork-database-repository'), 'Cargo.toml must declare sdkwork-database-repository');
assert(cargoToml.includes('sdkwork-web-core'), 'Cargo.toml must declare sdkwork-web-core');
assert(cargoToml.includes('sdkwork-web-axum'), 'Cargo.toml must declare sdkwork-web-axum');
assert(cargoToml.includes('sdkwork-iam-web-adapter'), 'Cargo.toml must declare sdkwork-iam-web-adapter');
assert(!cargoToml.includes('sdkwork-discovery'), 'sdkwork-discovery is not required until RPC services exist');

const workflow = JSON.parse(readText('sdkwork.workflow.json'));
const dependencyIds = new Set((workflow.dependencies || []).map((dependency) => dependency.id));
for (const dependencyId of [
  'sdkwork-appbase',
  'sdkwork-database',
  'sdkwork-id',
  'sdkwork-ui',
  'sdkwork-sdk-commons',
  'sdkwork-sdk-generator',
  'sdkwork-web-framework',
]) {
  assert(dependencyIds.has(dependencyId), `sdkwork.workflow.json must declare ${dependencyId}`);
}

const routerCrates = [
  'crates/sdkwork-router-drive-open-api/Cargo.toml',
  'crates/sdkwork-router-drive-app-api/Cargo.toml',
  'crates/sdkwork-router-drive-backend-api/Cargo.toml',
  'crates/sdkwork-router-storage-backend-api/Cargo.toml',
];

for (const routerCrate of routerCrates) {
  assertCargoDependsOnWebFramework(routerCrate);
  const crateName = path.basename(path.dirname(routerCrate));
  assert(
    fs.existsSync(path.join(repoRoot, `crates/${crateName}/src/web_bootstrap.rs`)),
    `${crateName} must provide web_bootstrap.rs`,
  );
}

const appOpenapi = readText('apis/app-api/drive/drive-app-api.openapi.json');
assert(
  !appOpenapi.includes('"x-sdkwork-request-context": "AppRequestContext"'),
  'app OpenAPI must use WebRequestContext instead of AppRequestContext',
);
assert(
  appOpenapi.includes('"x-sdkwork-api-surface": "app-api"'),
  'app OpenAPI operations must declare x-sdkwork-api-surface',
);
assert(
  !appOpenapi.includes('"x-sdkwork-api-surface": "app"'),
  'app OpenAPI x-sdkwork-api-surface must use canonical app-api label',
);

for (const relativePath of [
  'apis/app-api/drive/drive-app-api.openapi.json',
  'apis/drive-app-api.openapi.json',
  'apis/backend-api/drive/drive-backend-api.openapi.json',
  'apis/drive-backend-api.openapi.json',
  'apis/backend-api/drive/drive-admin-storage-api.openapi.json',
  'apis/drive-admin-storage-api.openapi.json',
  'apis/open-api/drive/drive-open-api.openapi.json',
  'apis/drive-open-api.openapi.json',
]) {
  assertNoClientTenantIdInAppOpenapi(relativePath);
}

function walkRustTests(relativeRoot, visitor) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) {
    return;
  }
  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      walkRustTests(path.join(relativeRoot, entry.name).replace(/\\/g, '/'), visitor);
      continue;
    }
    if (!entry.name.endsWith('.rs')) {
      continue;
    }
    visitor(`${relativeRoot}/${entry.name}`.replace(/\\/g, '/'), fs.readFileSync(absolutePath, 'utf8'));
  }
}

for (const relativeRoot of [
  'crates/sdkwork-router-drive-app-api/tests',
  'crates/sdkwork-router-drive-backend-api/tests',
]) {
  walkRustTests(relativeRoot, (relativePath, source) => {
    assert(
      !source.includes('tenantId='),
      `${relativePath} must not send client tenantId query params`,
    );
  });
}

assert(
  fs.existsSync(path.join(repoRoot, 'specs/topology.spec.json')),
  'specs/topology.spec.json must exist per APP_RUNTIME_TOPOLOGY_ADOPTION.md',
);
assert(
  fs.existsSync(path.join(repoRoot, 'configs/topology/README.md')),
  'configs/topology/README.md must exist per APP_RUNTIME_TOPOLOGY_ADOPTION.md',
);

const rpcSignals = ['tonic', 'prost', 'sdkwork-discovery', '.proto'];
for (const signal of rpcSignals) {
  assert(!cargoToml.includes(signal), `Cargo.toml must not declare ${signal} until RPC services are introduced`);
}

if (failures.length > 0) {
  process.stderr.write(
    `Architecture alignment failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  );
  if (warnings.length > 0) {
    process.stderr.write(
      `Warnings:\n${warnings.map((warning) => `- ${warning}`).join('\n')}\n`,
    );
  }
  process.exit(1);
}

if (warnings.length > 0) {
  process.stdout.write(
    `Architecture alignment passed with warnings:\n${warnings.map((warning) => `- ${warning}`).join('\n')}\n`,
  );
} else {
  process.stdout.write('Architecture alignment passed\n');
}
