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
  cargoTargetDir: resolveCargoTargetDir('release'),
  nodeEnv: 'production',
  viteAppEnv: 'production',
});

ensureRustToolchainAvailable(env);

const child = spawn(tauriCommand, ['exec', 'tauri', 'build', ...process.argv.slice(2)], {
  cwd: desktopDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

child.on('error', (error) => {
  console.error(`[run-sdkwork-drive-tauri-build] ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[run-sdkwork-drive-tauri-build] tauri build exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
