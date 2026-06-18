#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

import {
  DEFAULT_BUILD_PROFILE_ID,
  loadProfile,
  mergeRuntimeEnv,
  REPO_ROOT,
  resolveBuildProfileId,
} from './lib/drive-topology.mjs';

const repoRoot = REPO_ROOT;

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function parseArgs(argv) {
  const settings = {
    hosting: 'cloud-hosted',
    debug: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--debug') {
      settings.debug = true;
      continue;
    }
    if (arg === '--hosting') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--hosting requires a value (cloud-hosted or self-hosted)');
      }
      if (value !== 'cloud-hosted' && value !== 'self-hosted') {
        throw new Error('--hosting must be cloud-hosted or self-hosted');
      }
      settings.hosting = value;
      index += 1;
      continue;
    }
    if (arg === '--topology') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--topology is retired; use --hosting');
      }
      settings.hosting = value === 'cloud' ? 'cloud-hosted' : 'self-hosted';
      index += 1;
    }
  }

  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/drive-build.mjs [options]

Build the Drive PC desktop app (Tauri).

Defaults:
  hosting cloud-hosted     Release desktop builds target cloud-hosted production profile.
  hosting self-hosted      On-prem desktop builds target self-hosted unified-process production.

Profiles load from configs/topology/{hosting}.{serviceLayout}.production.env

Options:
  --hosting <cloud-hosted|self-hosted>  Drive hosting model (default: cloud-hosted)
  --topology <cloud|standalone>         Retired alias for --hosting
  --debug                               Build debug desktop bundle instead of release
  --help, -h                            Show this help
`);
}

function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    process.exit(0);
  }

  const profileId = resolveBuildProfileId(settings.hosting);
  const profileEnv = loadProfile(profileId);
  const buildEnv = mergeRuntimeEnv(process.env, profileEnv, {
    SDKWORK_DRIVE_HOSTING: settings.hosting,
    VITE_DRIVE_PC_HOSTING: settings.hosting,
    SDKWORK_DRIVE_PROFILE_ID: profileId,
  });
  const buildScript = settings.debug ? 'desktop:build:local' : 'desktop:build';

  const child = spawn(
    pnpmCommand(),
    ['--dir', 'apps/sdkwork-drive-pc', buildScript],
    {
      cwd: repoRoot,
      env: buildEnv,
      stdio: 'inherit',
      shell: true,
    },
  );

  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}

main();
