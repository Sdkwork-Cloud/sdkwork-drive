import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const desktopPackagePath = path.join(rootDir, 'packages', 'sdkwork-drive-desktop', 'package.json');
const tauriDevRunnerPath = path.join(rootDir, 'scripts', 'run-sdkwork-drive-tauri-dev.mjs');
const tauriBuildRunnerPath = path.join(rootDir, 'scripts', 'run-sdkwork-drive-tauri-build.mjs');
const tauriInfoRunnerPath = path.join(rootDir, 'scripts', 'run-sdkwork-drive-tauri-info.mjs');
const tauriEnvHelperPath = path.join(rootDir, 'scripts', 'sdkwork-drive-tauri-env.mjs');
const tauriDevPortGuardPath = path.join(rootDir, 'scripts', 'ensure-tauri-dev-port-free.mjs');
const tauriDevBinaryGuardPath = path.join(rootDir, 'scripts', 'ensure-tauri-dev-binary-unlocked.mjs');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

test('desktop tauri dev delegates through the shared drive runner', () => {
  const desktopPackage = readJson(desktopPackagePath);

  assert.equal(
    desktopPackage.scripts?.['tauri:dev'],
    'node ../../scripts/run-sdkwork-drive-tauri-dev.mjs',
  );
});

test('desktop tauri build and info also delegate through shared runners', () => {
  const desktopPackage = readJson(desktopPackagePath);

  assert.equal(
    desktopPackage.scripts?.['tauri:build'],
    'node ../../scripts/run-sdkwork-drive-tauri-build.mjs',
  );
  assert.equal(
    desktopPackage.scripts?.['tauri:info'],
    'node ../../scripts/run-sdkwork-drive-tauri-info.mjs',
  );
});

test('drive tauri command helpers augment rust toolchain lookup before invoking tauri', () => {
  const envHelperSource = readFileSync(tauriEnvHelperPath, 'utf8');
  const devRunnerSource = readFileSync(tauriDevRunnerPath, 'utf8');
  const buildRunnerSource = readFileSync(tauriBuildRunnerPath, 'utf8');
  const infoRunnerSource = readFileSync(tauriInfoRunnerPath, 'utf8');

  assert.match(envHelperSource, /\.cargo', 'bin'/);
  assert.match(envHelperSource, /PATH:\s*createExecutableSearchPath/);
  assert.match(envHelperSource, /Rust toolchain not found/);
  assert.match(buildRunnerSource, /createTauriCommandEnv/);
  assert.match(buildRunnerSource, /ensureRustToolchainAvailable/);
  assert.match(buildRunnerSource, /\['exec', 'tauri', 'build'/);
  assert.match(infoRunnerSource, /createTauriCommandEnv/);
  assert.match(infoRunnerSource, /ensureRustToolchainAvailable/);
  assert.match(infoRunnerSource, /\['exec', 'tauri', 'info'/);
  assert.match(devRunnerSource, /ensure-tauri-dev-port-free\.mjs/);
  assert.match(devRunnerSource, /ensure-tauri-dev-binary-unlocked\.mjs/);
  assert.match(devRunnerSource, /\['exec', 'tauri', 'dev'\]/);
});

test('drive tauri dev port guard can inspect and clear stale desktop vite blockers', () => {
  const portGuardSource = readFileSync(tauriDevPortGuardPath, 'utf8');

  assert.match(portGuardSource, /Get-NetTCPConnection/);
  assert.match(portGuardSource, /Get-CimInstance Win32_Process/);
  assert.match(portGuardSource, /taskkill\.exe/);
  assert.match(portGuardSource, /sdkwork-drive-desktop/);
  assert.match(portGuardSource, /vite/);
});

test('drive tauri dev binary guard can clear stale desktop executable locks', () => {
  const binaryGuardSource = readFileSync(tauriDevBinaryGuardPath, 'utf8');

  assert.match(binaryGuardSource, /Get-CimInstance Win32_Process/);
  assert.match(binaryGuardSource, /taskkill/);
  assert.match(binaryGuardSource, /sdkwork-drive-desktop/);
  assert.match(binaryGuardSource, /\.tauri-target/);
});
