import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

export const DEFAULT_RELEASE_APP_SDK_REPO_URL = 'https://github.com/Sdkwork-Cloud/sdkwork-sdk-app.git';
export const DEFAULT_RELEASE_APP_SDK_REF = 'main';
export const DEFAULT_RELEASE_COMMON_SDK_REPO_URL = 'https://github.com/Sdkwork-Cloud/sdkwork-sdk-commons.git';
export const DEFAULT_RELEASE_COMMON_SDK_REF = 'main';
export const RELEASE_VENDOR_APP_SDK_REPO_DIR = 'vendor/sdkwork-sdk-app';
export const RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH = 'vendor/sdkwork-sdk-app/sdkwork-app-sdk-typescript';
export const RELEASE_VENDOR_COMMON_SDK_REPO_DIR = 'vendor/sdkwork-sdk-common';
export const RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH = 'vendor/sdkwork-sdk-common/sdkwork-sdk-common-typescript';

const ROOT_COPY_ENTRIES = [
  'docs',
  'package.json',
  'scripts',
  'tsconfig.base.json',
  'turbo.json',
  'packages',
];
const SKIPPED_COPY_DIR_NAMES = new Set([
  '.git',
  '.turbo',
  'node_modules',
  'target',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

export function resolveReleaseSdkConfig(env = process.env) {
  const appSdkRepoUrl = env.SDKWORK_DRIVE_RELEASE_APP_SDK_REPO_URL
    || DEFAULT_RELEASE_APP_SDK_REPO_URL;
  const appSdkRef = env.SDKWORK_DRIVE_RELEASE_APP_SDK_REF
    || DEFAULT_RELEASE_APP_SDK_REF;
  const sdkCommonRepoUrl = env.SDKWORK_DRIVE_RELEASE_COMMON_SDK_REPO_URL
    || DEFAULT_RELEASE_COMMON_SDK_REPO_URL;
  const sdkCommonRef = env.SDKWORK_DRIVE_RELEASE_COMMON_SDK_REF
    || DEFAULT_RELEASE_COMMON_SDK_REF;

  return {
    appSdkRepoUrl,
    appSdkRef,
    sdkCommonRepoUrl,
    sdkCommonRef,
    appSdkRepoDir: RELEASE_VENDOR_APP_SDK_REPO_DIR,
    appSdkWorkspacePath: RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH,
    sdkCommonRepoDir: RELEASE_VENDOR_COMMON_SDK_REPO_DIR,
    sdkCommonWorkspacePath: RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH,
  };
}

function copyEntry(sourceRoot, outputRoot, relativePath) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const outputPath = path.join(outputRoot, relativePath);

  if (!fs.existsSync(sourcePath)) {
    if (relativePath === 'docs') {
      ensureDirectory(outputPath);
      return;
    }

    throw new Error(`Missing required release workspace source entry: ${relativePath}`);
  }

  fs.cpSync(sourcePath, outputPath, {
    recursive: true,
    filter: (candidateSourcePath) => {
      const entryName = path.basename(candidateSourcePath);
      return !SKIPPED_COPY_DIR_NAMES.has(entryName);
    },
  });
}

function rewriteWorkspaceManifest(workspaceManifestContent) {
  const rewritten = String(workspaceManifestContent)
    .replace(
      /^\s*-\s*'?\.\.\/\.\.\/\.\.\/spring-ai-plus-app-api\/sdkwork-sdk-app\/sdkwork-app-sdk-typescript'?\s*$/gm,
      `  - '${RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH}'`,
    )
    .replace(
      /^\s*-\s*'?\.\.\/\.\.\/\.\.\/sdk\/sdkwork-sdk-commons\/sdkwork-sdk-common-typescript'?\s*$/gm,
      `  - '${RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH}'`,
    )
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

  if (!rewritten.includes(RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH)) {
    return rewritten.replace(
      /packages:\s*\n/,
      `packages:\n  - '${RELEASE_VENDOR_APP_SDK_WORKSPACE_PATH}'\n  - '${RELEASE_VENDOR_COMMON_SDK_WORKSPACE_PATH}'\n`,
    ).concat('\n');
  }

  return `${rewritten}\n`;
}

function rewriteRootPackageJson(outputRoot) {
  const packageJsonPath = path.join(outputRoot, 'package.json');
  const packageJson = readJson(packageJsonPath);

  packageJson.scripts ||= {};
  packageJson.scripts['prepare:release-workspace'] = 'node scripts/prepare-sdkwork-drive-release-workspace.mjs';
  packageJson.scripts['prepare:release-sdk-sources'] = 'node scripts/materialize-sdkwork-drive-release-sdks.mjs';
  packageJson.scripts['prepare:release-sdk-builds'] = 'node scripts/build-sdkwork-drive-release-sdks.mjs';

  writeJson(packageJsonPath, packageJson);
}

export function prepareReleaseWorkspace({
  sourceRoot = workspaceRoot,
  outputRoot = path.join(workspaceRoot, '.release-workspace'),
  env = process.env,
} = {}) {
  const config = resolveReleaseSdkConfig(env);
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);

  fs.rmSync(resolvedOutputRoot, {
    recursive: true,
    force: true,
  });
  ensureDirectory(resolvedOutputRoot);

  for (const entry of ROOT_COPY_ENTRIES) {
    copyEntry(resolvedSourceRoot, resolvedOutputRoot, entry);
  }

  const originalWorkspaceManifest = fs.readFileSync(
    path.join(resolvedSourceRoot, 'pnpm-workspace.yaml'),
    'utf8',
  );
  fs.writeFileSync(
    path.join(resolvedOutputRoot, 'pnpm-workspace.yaml'),
    rewriteWorkspaceManifest(originalWorkspaceManifest),
  );

  ensureDirectory(path.join(resolvedOutputRoot, RELEASE_VENDOR_APP_SDK_REPO_DIR));
  ensureDirectory(path.join(resolvedOutputRoot, RELEASE_VENDOR_COMMON_SDK_REPO_DIR));
  rewriteRootPackageJson(resolvedOutputRoot);

  return {
    outputRoot: resolvedOutputRoot,
    config,
  };
}

function parseCliArgs(argv) {
  const options = {
    sourceRoot: workspaceRoot,
    outputRoot: path.join(workspaceRoot, '.release-workspace'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--source-dir' && next) {
      options.sourceRoot = path.resolve(next);
      index += 1;
      continue;
    }

    if (token === '--output-dir' && next) {
      options.outputRoot = path.resolve(next);
      index += 1;
    }
  }

  return options;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const result = prepareReleaseWorkspace(options);
  console.log(`[prepare-sdkwork-drive-release-workspace] Prepared ${result.outputRoot}`);
  console.log(
    `[prepare-sdkwork-drive-release-workspace] Release SDK sources will be materialized from ${result.config.appSdkRepoUrl}#${result.config.appSdkRef} and ${result.config.sdkCommonRepoUrl}#${result.config.sdkCommonRef}`,
  );
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  main();
}
