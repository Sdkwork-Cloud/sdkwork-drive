import process from 'node:process';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const RELEASE_SDK_BUILD_ORDER = [
  '@sdkwork/sdk-common',
  '@sdkwork/app-sdk',
];

function run(command, args) {
  const result = spawnSync(command, args, {
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

export function createReleaseSdkBuildPlan({ workspaceRoot = rootDir } = {}) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return RELEASE_SDK_BUILD_ORDER.map((packageName) => ({
    workspaceRoot: resolvedWorkspaceRoot,
    packageName,
    command: 'pnpm',
    args: ['--dir', resolvedWorkspaceRoot, '--filter', packageName, 'build'],
  }));
}

export function buildReleaseSdkPackages(options = {}) {
  const plan = createReleaseSdkBuildPlan(options);

  for (const step of plan) {
    run(step.command, step.args);
  }

  return plan;
}

function parseCliArgs(argv) {
  const options = {
    workspaceRoot: rootDir,
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
  const plan = buildReleaseSdkPackages(options);
  console.log(
    `[build-sdkwork-drive-release-sdks] Built ${plan.map((step) => step.packageName).join(', ')} in ${path.resolve(options.workspaceRoot)}`,
  );
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  main();
}
