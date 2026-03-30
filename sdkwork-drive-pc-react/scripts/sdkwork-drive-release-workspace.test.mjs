import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  prepareReleaseWorkspace,
  resolveReleaseSdkConfig,
} from './prepare-sdkwork-drive-release-workspace.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function resolveWorkflowPath(startDir) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, '.github', 'workflows', 'sdkwork-drive-desktop-release.yml');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

const workflowPath = resolveWorkflowPath(rootDir);

test('resolveWorkflowPath returns null when no repository workflow metadata exists above the workspace', () => {
  const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdkwork-drive-workflow-missing-'));

  assert.equal(resolveWorkflowPath(isolatedDir), null);
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createFixtureWorkspace(tempRoot) {
  const sourceRoot = path.join(tempRoot, 'source');

  fs.mkdirSync(path.join(sourceRoot, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'packages', 'sdkwork-drive-core'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'packages', 'sdkwork-drive-drive'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'packages', 'sdkwork-drive-desktop'), { recursive: true });

  writeJson(path.join(sourceRoot, 'package.json'), {
    name: '@sdkwork/drive-workspace',
    private: true,
    type: 'module',
    scripts: {
      test: 'pnpm check:structure && pnpm test:structure && pnpm test:packages',
      'prepare:release-workspace': 'node scripts/prepare-sdkwork-drive-release-workspace.mjs',
    },
  });
  fs.writeFileSync(
    path.join(sourceRoot, 'pnpm-workspace.yaml'),
    [
      'packages:',
      "  - 'packages/sdkwork-drive-*'",
      "  - '../../../spring-ai-plus-app-api/sdkwork-sdk-app/sdkwork-app-sdk-typescript'",
      "  - '../../../sdk/sdkwork-sdk-commons/sdkwork-sdk-common-typescript'",
      '',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(sourceRoot, 'tsconfig.base.json'), '{}\n');
  fs.writeFileSync(path.join(sourceRoot, 'turbo.json'), '{}\n');
  fs.writeFileSync(path.join(sourceRoot, 'scripts', 'placeholder.mjs'), 'export {};\n');

  writeJson(path.join(sourceRoot, 'packages', 'sdkwork-drive-core', 'package.json'), {
    name: '@sdkwork/drive-core',
    private: true,
    type: 'module',
    dependencies: {
      '@sdkwork/app-sdk': 'workspace:*',
    },
  });
  writeJson(path.join(sourceRoot, 'packages', 'sdkwork-drive-drive', 'package.json'), {
    name: '@sdkwork/drive-drive',
    private: true,
    type: 'module',
    dependencies: {
      '@sdkwork/app-sdk': 'workspace:*',
    },
  });
  writeJson(path.join(sourceRoot, 'packages', 'sdkwork-drive-desktop', 'package.json'), {
    name: '@sdkwork/drive-desktop',
    private: true,
    type: 'module',
  });

  return sourceRoot;
}

test('resolveReleaseSdkConfig materializes git-backed SDK specs for release mode', () => {
  const config = resolveReleaseSdkConfig({
    SDKWORK_DRIVE_RELEASE_APP_SDK_REPO_URL: 'https://github.com/acme/app-sdk.git',
    SDKWORK_DRIVE_RELEASE_APP_SDK_REF: 'release-app',
    SDKWORK_DRIVE_RELEASE_COMMON_SDK_REPO_URL: 'https://github.com/acme/sdk-common.git',
    SDKWORK_DRIVE_RELEASE_COMMON_SDK_REF: 'release-common',
  });

  assert.equal(config.appSdkRepoUrl, 'https://github.com/acme/app-sdk.git');
  assert.equal(config.appSdkRef, 'release-app');
  assert.equal(config.sdkCommonRepoUrl, 'https://github.com/acme/sdk-common.git');
  assert.equal(config.sdkCommonRef, 'release-common');
});

test('prepareReleaseWorkspace keeps local workspace packages and rewires release workspace to vendored git SDK sources', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sdkwork-drive-release-workspace-'));
  const sourceRoot = createFixtureWorkspace(tempRoot);
  const outputRoot = path.join(tempRoot, 'release-workspace');

  prepareReleaseWorkspace({
    sourceRoot,
    outputRoot,
    env: {
      SDKWORK_DRIVE_RELEASE_APP_SDK_REPO_URL: 'https://github.com/acme/app-sdk.git',
      SDKWORK_DRIVE_RELEASE_APP_SDK_REF: 'release-app',
      SDKWORK_DRIVE_RELEASE_COMMON_SDK_REPO_URL: 'https://github.com/acme/sdk-common.git',
      SDKWORK_DRIVE_RELEASE_COMMON_SDK_REF: 'release-common',
    },
  });

  const preparedWorkspaceManifest = fs.readFileSync(path.join(outputRoot, 'pnpm-workspace.yaml'), 'utf8');
  assert.doesNotMatch(preparedWorkspaceManifest, /spring-ai-plus-app-api/);
  assert.doesNotMatch(preparedWorkspaceManifest, /sdkwork-sdk-commons/);
  assert.match(preparedWorkspaceManifest, /packages\/sdkwork-drive-\*/);
  assert.match(preparedWorkspaceManifest, /vendor\/sdkwork-sdk-app\/sdkwork-app-sdk-typescript/);
  assert.match(preparedWorkspaceManifest, /vendor\/sdkwork-sdk-common\/sdkwork-sdk-common-typescript/);

  const preparedRootPackageJson = readJson(path.join(outputRoot, 'package.json'));
  assert.equal(
    preparedRootPackageJson.scripts['prepare:release-workspace'],
    'node scripts/prepare-sdkwork-drive-release-workspace.mjs',
  );
  assert.equal(
    preparedRootPackageJson.scripts['prepare:release-sdk-sources'],
    'node scripts/materialize-sdkwork-drive-release-sdks.mjs',
  );
  assert.equal(
    preparedRootPackageJson.scripts['prepare:release-sdk-builds'],
    'node scripts/build-sdkwork-drive-release-sdks.mjs',
  );

  const preparedCorePackageJson = readJson(path.join(outputRoot, 'packages', 'sdkwork-drive-core', 'package.json'));
  const preparedDrivePackageJson = readJson(path.join(outputRoot, 'packages', 'sdkwork-drive-drive', 'package.json'));

  assert.equal(
    preparedCorePackageJson.dependencies['@sdkwork/app-sdk'],
    'workspace:*',
  );
  assert.equal(
    preparedDrivePackageJson.dependencies['@sdkwork/app-sdk'],
    'workspace:*',
  );
  assert.equal(fs.existsSync(path.join(outputRoot, 'vendor', 'sdkwork-sdk-app')), true);
  assert.equal(fs.existsSync(path.join(outputRoot, 'vendor', 'sdkwork-sdk-common')), true);
});

test('github desktop release workflow prepares the release workspace and publishes matrix bundles', (t) => {
  if (!workflowPath) {
    t.skip('workflow assertions are only available in the source workspace');
    return;
  }

  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflow, /sdkwork-drive-desktop-release/);
  assert.match(workflow, /prepare-sdkwork-drive-release-workspace\.mjs/);
  assert.match(workflow, /materialize-sdkwork-drive-release-sdks\.mjs/);
  assert.match(workflow, /prepare:release-sdk-builds/);
  assert.match(workflow, /SDKWORK_DRIVE_RELEASE_APP_SDK_REPO_URL/);
  assert.match(workflow, /SDKWORK_DRIVE_RELEASE_COMMON_SDK_REPO_URL/);
  assert.match(workflow, /windows-11-arm/);
  assert.match(workflow, /ubuntu-24\.04-arm/);
  assert.match(workflow, /macos-15-intel/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.match(
    workflow,
    /Install release workspace dependencies[\s\S]*prepare:release-sdk-builds[\s\S]*Run release verification/,
  );
});
