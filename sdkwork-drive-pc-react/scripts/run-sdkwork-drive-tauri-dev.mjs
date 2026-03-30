#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'packages', 'sdkwork-drive-desktop');
const desktopSrcTauriDir = path.join(desktopDir, 'src-tauri');
const cargoTargetDir = path.join(desktopDir, '.tauri-target', 'dev');
const nodeCommand = process.execPath;
const tauriCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const pathDelimiter = process.platform === 'win32' ? ';' : ':';

function resolveCargoExecutableName(platform = process.platform) {
  return platform === 'win32' ? 'cargo.exe' : 'cargo';
}

function uniqueExistingPaths(candidates) {
  const seen = new Set();
  const resolved = [];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim().length === 0) {
      continue;
    }

    const normalizedCandidate = path.resolve(candidate);
    if (!existsSync(normalizedCandidate) || seen.has(normalizedCandidate)) {
      continue;
    }

    seen.add(normalizedCandidate);
    resolved.push(normalizedCandidate);
  }

  return resolved;
}

function resolveRustCargoBinCandidates(env = process.env) {
  const homeDir = env.USERPROFILE ?? env.HOME ?? null;
  const cargoHome = env.CARGO_HOME ?? (homeDir ? path.join(homeDir, '.cargo') : null);

  return uniqueExistingPaths([
    cargoHome ? path.join(cargoHome, 'bin') : null,
    homeDir ? path.join(homeDir, '.cargo', 'bin') : null,
  ]).filter((candidatePath) =>
    existsSync(path.join(candidatePath, resolveCargoExecutableName())),
  );
}

function createExecutableSearchPath(env = process.env, prependEntries = []) {
  const existingEntries =
    typeof env.PATH === 'string' && env.PATH.trim().length > 0
      ? env.PATH.split(pathDelimiter).filter(Boolean)
      : [];

  return [...uniqueExistingPaths(prependEntries), ...existingEntries]
    .filter((value, index, items) => items.indexOf(value) === index)
    .join(pathDelimiter);
}

function executableExists(executableName, searchPath) {
  const entries =
    typeof searchPath === 'string' && searchPath.trim().length > 0
      ? searchPath.split(pathDelimiter).filter(Boolean)
      : [];

  return entries.some((entry) => existsSync(path.join(entry, executableName)));
}

function createTauriCommandEnv(env = process.env) {
  const cargoBinCandidates = resolveRustCargoBinCandidates(env);
  const homeDir = env.USERPROFILE ?? env.HOME ?? null;
  const resolvedCargoHome =
    env.CARGO_HOME ??
    (homeDir && existsSync(path.join(homeDir, '.cargo')) ? path.join(homeDir, '.cargo') : null);
  const resolvedRustupHome =
    env.RUSTUP_HOME ??
    (homeDir && existsSync(path.join(homeDir, '.rustup')) ? path.join(homeDir, '.rustup') : null);

  return {
    ...env,
    ...(resolvedCargoHome ? { CARGO_HOME: resolvedCargoHome } : {}),
    ...(resolvedRustupHome ? { RUSTUP_HOME: resolvedRustupHome } : {}),
    PATH: createExecutableSearchPath(env, cargoBinCandidates),
    CARGO_TARGET_DIR: cargoTargetDir,
  };
}

function ensureRustToolchainAvailable(env) {
  const cargoExecutable = resolveCargoExecutableName();
  if (executableExists(cargoExecutable, env.PATH)) {
    return;
  }

  console.error(
    [
      'Rust toolchain not found. Install rustup or make cargo available on PATH before running `pnpm tauri:dev`.',
      `Checked PATH and local fallback under ${path.join(process.env.USERPROFILE ?? process.env.HOME ?? '~', '.cargo', 'bin')}.`,
    ].join('\n'),
  );
  process.exit(1);
}

function runNodePreflight(scriptArgs, env = process.env) {
  const result = spawnSync(nodeCommand, scriptArgs, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

function run() {
  const env = createTauriCommandEnv(process.env);
  ensureRustToolchainAvailable(env);
  runNodePreflight(['scripts/ensure-tauri-dev-port-free.mjs', '127.0.0.1', '1420'], env);
  runNodePreflight(
    ['scripts/ensure-tauri-dev-binary-unlocked.mjs', desktopSrcTauriDir, 'sdkwork-drive-desktop'],
    env,
  );

  const child = spawn(tauriCommand, ['exec', 'tauri', 'dev'], {
    cwd: desktopDir,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  child.on('error', (error) => {
    console.error(`[run-sdkwork-drive-tauri-dev] ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[run-sdkwork-drive-tauri-dev] tauri dev exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

run();
