import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  RELEASE_VENDOR_APP_SDK_REPO_DIR,
  RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH,
  RELEASE_VENDOR_COMMON_SDK_REPO_DIR,
  RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH,
  resolveReleaseSdkConfig,
} from './prepare-sdkwork-drive-release-workspace.mjs';

const __filename = fileURLToPath(import.meta.url);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function cloneRepo({ repoUrl, ref, outputDir }) {
  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(path.dirname(outputDir), { recursive: true });
  run('git', ['clone', '--depth', '1', '--branch', ref, repoUrl, outputDir], process.cwd());
}

function assertPackageManifestExists(packageJsonPath, label) {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`[materialize-sdkwork-drive-release-sdks] Missing ${label} package.json at ${packageJsonPath}`);
  }
}

export function materializeReleaseSdkSources({
  workspaceRoot = process.cwd(),
  env = process.env,
} = {}) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const config = resolveReleaseSdkConfig(env);

  const appSdkRepoRoot = path.join(resolvedWorkspaceRoot, RELEASE_VENDOR_APP_SDK_REPO_DIR);
  const sdkCommonRepoRoot = path.join(resolvedWorkspaceRoot, RELEASE_VENDOR_COMMON_SDK_REPO_DIR);

  cloneRepo({
    repoUrl: config.appSdkRepoUrl,
    ref: config.appSdkRef,
    outputDir: appSdkRepoRoot,
  });
  cloneRepo({
    repoUrl: config.sdkCommonRepoUrl,
    ref: config.sdkCommonRef,
    outputDir: sdkCommonRepoRoot,
  });

  assertPackageManifestExists(
    path.join(resolvedWorkspaceRoot, RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH, 'package.json'),
    '@sdkwork/app-sdk',
  );
  assertPackageManifestExists(
    path.join(resolvedWorkspaceRoot, RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH, 'package.json'),
    '@sdkwork/sdk-common',
  );

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    appSdkRepoRoot,
    sdkCommonRepoRoot,
    config,
  };
}

function parseCliArgs(argv) {
  const options = {
    workspaceRoot: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--workspace-root' && next) {
      options.workspaceRoot = path.resolve(next);
      index += 1;
    }
  }

  return options;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const result = materializeReleaseSdkSources(options);
  console.log(`[materialize-sdkwork-drive-release-sdks] Materialized @sdkwork/app-sdk into ${result.appSdkRepoRoot}`);
  console.log(`[materialize-sdkwork-drive-release-sdks] Materialized @sdkwork/sdk-common into ${result.sdkCommonRepoRoot}`);
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  main();
}
