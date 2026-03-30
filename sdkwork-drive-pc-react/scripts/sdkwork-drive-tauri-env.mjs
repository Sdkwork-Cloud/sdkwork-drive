#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, '..');
export const desktopDir = path.join(rootDir, 'packages', 'sdkwork-drive-desktop');
export const tauriCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const pathDelimiter = process.platform === 'win32' ? ';' : ':';

export function resolveCargoExecutableName(platform = process.platform) {
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

export function resolveRustCargoBinCandidates(env = process.env) {
  const homeDir = env.USERPROFILE ?? env.HOME ?? null;
  const cargoHome = env.CARGO_HOME ?? (homeDir ? path.join(homeDir, '.cargo') : null);

  return uniqueExistingPaths([
    cargoHome ? path.join(cargoHome, 'bin') : null,
    homeDir ? path.join(homeDir, '.cargo', 'bin') : null,
  ]).filter((candidatePath) =>
    existsSync(path.join(candidatePath, resolveCargoExecutableName())),
  );
}

export function createExecutableSearchPath(env = process.env, prependEntries = []) {
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

export function resolveCargoTargetDir(scope = 'dev') {
  return path.join(desktopDir, '.tauri-target', scope);
}

export function createTauriCommandEnv(
  env = process.env,
  options = {},
) {
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
    ...(options.cargoTargetDir ? { CARGO_TARGET_DIR: options.cargoTargetDir } : {}),
    ...(options.nodeEnv ? { NODE_ENV: options.nodeEnv } : {}),
    ...(options.viteAppEnv ? { VITE_APP_ENV: options.viteAppEnv } : {}),
  };
}

export function ensureRustToolchainAvailable(env = process.env) {
  const cargoExecutable = resolveCargoExecutableName();
  if (executableExists(cargoExecutable, env.PATH)) {
    return;
  }

  console.error(
    [
      'Rust toolchain not found. Install rustup or make cargo available on PATH before running this tauri command.',
      `Checked PATH and local fallback under ${path.join(process.env.USERPROFILE ?? process.env.HOME ?? '~', '.cargo', 'bin')}.`,
    ].join('\n'),
  );
  process.exit(1);
}
