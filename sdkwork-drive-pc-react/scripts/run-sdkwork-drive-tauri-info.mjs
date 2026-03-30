#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';
import {
  createTauriCommandEnv,
  desktopDir,
  ensureRustToolchainAvailable,
  resolveCargoTargetDir,
  tauriCommand,
} from './sdkwork-drive-tauri-env.mjs';

const env = createTauriCommandEnv(process.env, {
  cargoTargetDir: resolveCargoTargetDir('info'),
});

ensureRustToolchainAvailable(env);

const child = spawn(tauriCommand, ['exec', 'tauri', 'info', ...process.argv.slice(2)], {
  cwd: desktopDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

child.on('error', (error) => {
  console.error(`[run-sdkwork-drive-tauri-info] ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[run-sdkwork-drive-tauri-info] tauri info exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
