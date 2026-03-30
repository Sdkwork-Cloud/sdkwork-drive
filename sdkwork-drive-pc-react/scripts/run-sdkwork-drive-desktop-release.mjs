#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  findDesktopReleaseTargetByTriple,
  listDesktopReleaseTargets,
  resolveDesktopReleaseTarget,
} from './sdkwork-drive-desktop-release-targets.mjs';
import {
  createTauriCommandEnv,
  desktopDir,
  ensureRustToolchainAvailable,
} from './sdkwork-drive-tauri-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function parseCliArgs(argv) {
  const options = {
    platform: '',
    arch: '',
    target: '',
    listTargets: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--platform') {
      options.platform = next ?? '';
      index += 1;
      continue;
    }

    if (token === '--arch') {
      options.arch = next ?? '';
      index += 1;
      continue;
    }

    if (token === '--target') {
      options.target = next ?? '';
      index += 1;
      continue;
    }

    if (token === '--list-targets') {
      options.listTargets = true;
      continue;
    }

    if (token === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

function resolveBuildTarget(options) {
  const explicitTarget = String(options.target ?? '').trim();
  if (explicitTarget) {
    const match = findDesktopReleaseTargetByTriple(explicitTarget);
    if (!match) {
      throw new Error(`Unsupported target triple: ${explicitTarget}`);
    }

    return match;
  }

  return resolveDesktopReleaseTarget({
    platform: options.platform,
    arch: options.arch,
  });
}

export function createDesktopReleaseCommand(options = {}) {
  const target = resolveBuildTarget(options);

  return {
    command: 'pnpm',
    args: [
      '--filter',
      '@sdkwork/drive-desktop',
      'exec',
      'tauri',
      'build',
      '--target',
      target.target,
    ],
    target,
    cwd: rootDir,
  };
}

function printTargetTable() {
  const rows = listDesktopReleaseTargets()
    .map((entry) => `${entry.platform.padEnd(7)} ${entry.arch.padEnd(5)} ${entry.target}`)
    .join('\n');

  console.log(rows);
}

function runCli() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.listTargets) {
    printTargetTable();
    return;
  }

  const plan = createDesktopReleaseCommand(options);
  if (options.dryRun) {
    console.log(`${plan.command} ${plan.args.join(' ')}`);
    return;
  }

  const env = createTauriCommandEnv(process.env, {
    cargoTargetDir: path.join(desktopDir, '.tauri-target', 'release', plan.target.target),
    nodeEnv: 'production',
    viteAppEnv: 'production',
  });

  ensureRustToolchainAvailable(env);

  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  child.on('error', (error) => {
    console.error(`[run-sdkwork-drive-desktop-release] ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[run-sdkwork-drive-desktop-release] build exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  runCli();
}
