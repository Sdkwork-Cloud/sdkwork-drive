#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function cargoCommand() {
  return process.platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function nodeCommand() {
  return process.execPath;
}

function command(commandName, args, options = {}) {
  return {
    commandName,
    args,
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
  };
}

function nodeScript(scriptPath, args = []) {
  return command(nodeCommand(), [scriptPath, ...args]);
}

function pnpm(args, options = {}) {
  return command(pnpmCommand(), args, options);
}

function cargo(args) {
  return command(cargoCommand(), args);
}

const COMMANDS = new Map([
  ['dev', pnpm(['dev:browser'])],
  ['dev:browser', pnpm(['dev:browser:postgres:unified-process:standalone'])],
  ['dev:browser:postgres', pnpm(['dev:browser:postgres:unified-process:standalone'])],
  ['dev:browser:sqlite', nodeScript('scripts/drive-dev.mjs', ['--target', 'browser', '--database', 'sqlite', '--service-layout', 'unified-process', '--deployment-profile', 'standalone'])],
  ['dev:browser:postgres:unified-process:standalone', nodeScript('scripts/drive-dev.mjs', ['--target', 'browser', '--database', 'postgres', '--service-layout', 'unified-process', '--deployment-profile', 'standalone'])],
  ['dev:browser:postgres:split-services:cloud', nodeScript('scripts/drive-dev.mjs', ['--target', 'browser', '--database', 'postgres', '--service-layout', 'split-services', '--deployment-profile', 'cloud'])],
  ['dev:desktop', pnpm(['dev:desktop:postgres:unified-process:standalone'])],
  ['dev:desktop:postgres', pnpm(['dev:desktop:postgres:unified-process:standalone'])],
  ['dev:desktop:postgres:unified-process:standalone', nodeScript('scripts/drive-dev.mjs', ['--target', 'desktop', '--database', 'postgres', '--service-layout', 'unified-process', '--deployment-profile', 'standalone'])],
  ['dev:desktop:sqlite', nodeScript('scripts/drive-dev.mjs', ['--target', 'desktop', '--database', 'sqlite', '--service-layout', 'unified-process', '--deployment-profile', 'standalone'])],
  ['dev:desktop:postgres:split-services:cloud', nodeScript('scripts/drive-dev.mjs', ['--target', 'desktop', '--database', 'postgres', '--service-layout', 'split-services', '--deployment-profile', 'cloud'])],
  ['dev:server', nodeScript('scripts/run-drive-api-server.mjs', ['server', '--dev-env-file', '.env.postgres'])],
  ['dev:server:postgres', nodeScript('scripts/run-drive-api-server.mjs', ['server', '--dev-env-file', '.env.postgres'])],
  ['dev:server:sqlite', nodeScript('scripts/run-drive-api-server.mjs', ['server', '--', '--database-url', 'sqlite://target/dev/sdkwork-drive.sqlite'])],

  ['build', nodeScript('scripts/drive-build.mjs', ['--deployment-profile', 'cloud'])],
  ['build:cloud', nodeScript('scripts/drive-build.mjs', ['--deployment-profile', 'cloud'])],
  ['build:standalone', nodeScript('scripts/drive-build.mjs', ['--deployment-profile', 'standalone'])],
  ['build:desktop', nodeScript('scripts/drive-build.mjs', ['--deployment-profile', 'standalone'])],
  ['build:debug', nodeScript('scripts/drive-build.mjs', ['--deployment-profile', 'cloud', '--debug'])],

  ['start', nodeScript('scripts/run-drive-api-server.mjs', ['server', '--dev-env-file', '.env.postgres'])],
  ['test', cargo(['test', '--workspace'])],
  ['test:pc', pnpm(['--dir', 'apps/sdkwork-drive-pc', 'test'])],
  ['typecheck', pnpm(['--dir', 'apps/sdkwork-drive-pc', 'typecheck'])],
  ['typecheck:pc', pnpm(['--dir', 'apps/sdkwork-drive-pc', 'typecheck'])],
  ['lint', cargo(['clippy', '--workspace', '--tests', '--', '-D', 'warnings'])],
  ['format', cargo(['fmt', '--all'])],
  ['format:rust', cargo(['fmt', '--all'])],
  ['format:check', cargo(['fmt', '--all', '--', '--check'])],
  ['format:rust:check', cargo(['fmt', '--all', '--', '--check'])],

  ['check', nodeScript('tools/check_sdkwork_drive_dependency_management.mjs')],
  ['check:dependency-management', nodeScript('tools/check_sdkwork_drive_dependency_management.mjs')],
  ['check:app-sdk-consumers', nodeScript('tools/check_drive_app_sdk_consumer_integration.mjs')],
  ['check:pc-standard', nodeScript('tools/check_sdkwork_drive_pc_standard.mjs')],
  ['check:package-standard', nodeScript('tools/check_sdkwork_drive_package_standard.mjs')],
  ['check:architecture-alignment', nodeScript('tools/check_sdkwork_drive_architecture_alignment.mjs')],
  ['check:pnpm-script-standard', nodeScript('../sdkwork-specs/tools/check-pnpm-script-standard.mjs', ['--root', '.', '--product-prefix', 'drive'])],
  ['check:agent-workflow-standard', nodeScript('../sdkwork-specs/tools/check-agent-workflow-standard.mjs', ['--root', '.'])],

  ['topology:plan:server', nodeScript('scripts/run-drive-api-server.mjs', ['plan'])],
  ['topology:plan:server:postgres', nodeScript('scripts/run-drive-api-server.mjs', ['plan', '--dev-env-file', '.env.postgres'])],
  ['topology:plan:server:sqlite', nodeScript('scripts/run-drive-api-server.mjs', ['plan', '--', '--database-url', 'sqlite://target/dev/sdkwork-drive.sqlite'])],

  ['gateway:run:standalone', nodeScript('scripts/gateway-standalone-run.mjs', ['--environment', 'development'])],
  ['gateway:run:standalone:prod', nodeScript('scripts/gateway-standalone-run.mjs', ['--environment', 'production', '--release'])],
  ['gateway:plan:standalone', nodeScript('scripts/gateway-standalone-run.mjs', ['--environment', 'development', '--dry-run'])],
  ['gateway:build:standalone', cargo(['build', '--release', '-p', 'sdkwork-drive-standalone-gateway', '--bin', 'sdkwork-drive-standalone-gateway'])],
  ['gateway:package:standalone', nodeScript('scripts/gateway-standalone-pack.mjs', ['package'])],
  ['gateway:validate:standalone', nodeScript('scripts/gateway-standalone-pack.mjs', ['validate'])],
  ['gateway:package:cloud', nodeScript('scripts/gateway-cloud-bundle.mjs', ['bundle'])],
  ['gateway:validate:cloud', nodeScript('scripts/gateway-cloud-bundle.mjs', ['validate'])],
  ['gateway:matrix', nodeScript('scripts/print-gateway-package-matrix.mjs', ['--profile', 'all'])],
  ['gateway:matrix:standalone', nodeScript('scripts/print-gateway-package-matrix.mjs', ['--profile', 'application-public-ingress'])],
  ['gateway:matrix:cloud', nodeScript('scripts/print-gateway-package-matrix.mjs', ['--profile', 'platform-config-bundle'])],

  ['sbom:generate', nodeScript('tools/generate_release_sbom.mjs')],
]);

function assertInsideRepo(targetPath) {
  const resolved = path.resolve(REPO_ROOT, targetPath);
  const relative = path.relative(REPO_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`refusing to clean outside repository root: ${resolved}`);
  }
  return resolved;
}

function cleanWorkspace() {
  const targets = [
    'apps/sdkwork-drive-pc/dist',
    'target/dev',
  ];
  const packagesRoot = path.join(REPO_ROOT, 'apps', 'sdkwork-drive-pc', 'packages');
  if (fs.existsSync(packagesRoot)) {
    for (const entry of fs.readdirSync(packagesRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        targets.push(path.join('apps', 'sdkwork-drive-pc', 'packages', entry.name, 'dist'));
      }
    }
  }

  for (const target of targets) {
    const resolved = assertInsideRepo(target);
    fs.rmSync(resolved, { recursive: true, force: true });
    console.log(`[sdkwork-drive] removed ${path.relative(REPO_ROOT, resolved)}`);
  }
}

function printHelp() {
  console.log(`Usage: node scripts/sdkwork-command.mjs <standard-command> [-- extra args]

Examples:
  pnpm dev
  pnpm dev:desktop
  pnpm dev:server:postgres
  pnpm build:standalone
  pnpm gateway:package:cloud
  pnpm check:pnpm-script-standard
  pnpm check:agent-workflow-standard
`);
}

function run(entry, extraArgs) {
  const child = spawn(entry.commandName, [...entry.args, ...extraArgs], {
    cwd: entry.cwd,
    env: entry.env,
    stdio: 'inherit',
    windowsHide: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}

function main() {
  const [commandName, ...extraArgs] = process.argv.slice(2);
  if (!commandName || commandName === '--help' || commandName === '-h') {
    printHelp();
    process.exit(commandName ? 0 : 1);
  }
  if (commandName === 'clean') {
    cleanWorkspace();
    return;
  }
  if (commandName === 'verify') {
    run(nodeScript('scripts/sdkwork-verify.mjs'), extraArgs);
    return;
  }
  const entry = COMMANDS.get(commandName);
  if (!entry) {
    console.error(`[sdkwork-drive] unknown standard command: ${commandName}`);
    console.error('[sdkwork-drive] run with --help to see examples');
    process.exit(1);
  }
  run(entry, extraArgs);
}

main();
