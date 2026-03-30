import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listDesktopReleaseTargets,
  resolveDesktopReleaseTarget,
} from './sdkwork-drive-desktop-release-targets.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const desktopPackageDir = path.join(rootDir, 'packages', 'sdkwork-drive-desktop');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

test('desktop release target matrix covers mainstream platform and cpu combinations', () => {
  assert.deepEqual(
    listDesktopReleaseTargets(),
    [
      { platform: 'windows', arch: 'x64', target: 'x86_64-pc-windows-msvc' },
      { platform: 'windows', arch: 'arm64', target: 'aarch64-pc-windows-msvc' },
      { platform: 'linux', arch: 'x64', target: 'x86_64-unknown-linux-gnu' },
      { platform: 'linux', arch: 'arm64', target: 'aarch64-unknown-linux-gnu' },
      { platform: 'macos', arch: 'x64', target: 'x86_64-apple-darwin' },
      { platform: 'macos', arch: 'arm64', target: 'aarch64-apple-darwin' },
    ],
  );

  assert.deepEqual(resolveDesktopReleaseTarget({ platform: 'windows', arch: 'x64' }), {
    platform: 'windows',
    arch: 'x64',
    target: 'x86_64-pc-windows-msvc',
  });
});

test('workspace root exposes release scripts for cross-platform desktop bundles', () => {
  const packageJson = readJson(path.join(rootDir, 'package.json'));

  assert.equal(packageJson.scripts['release:desktop'], 'node scripts/run-sdkwork-drive-desktop-release.mjs');
  assert.equal(packageJson.scripts['release:desktop:list-targets'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --list-targets');
  assert.equal(packageJson.scripts['release:desktop:windows:x64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform windows --arch x64');
  assert.equal(packageJson.scripts['release:desktop:windows:arm64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform windows --arch arm64');
  assert.equal(packageJson.scripts['release:desktop:linux:x64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform linux --arch x64');
  assert.equal(packageJson.scripts['release:desktop:linux:arm64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform linux --arch arm64');
  assert.equal(packageJson.scripts['release:desktop:macos:x64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform macos --arch x64');
  assert.equal(packageJson.scripts['release:desktop:macos:arm64'], 'node scripts/run-sdkwork-drive-desktop-release.mjs --platform macos --arch arm64');
});

test('desktop tauri host is configured for tray persistence and bundle packaging', () => {
  const cargoToml = readFileSync(path.join(desktopPackageDir, 'src-tauri', 'Cargo.toml'), 'utf8');
  const tauriConfig = readJson(path.join(desktopPackageDir, 'src-tauri', 'tauri.conf.json'));
  const rustAssemblySource = readFileSync(path.join(desktopPackageDir, 'src-tauri', 'src', 'lib.rs'), 'utf8');
  const rustBootstrapSource = readFileSync(
    path.join(desktopPackageDir, 'src-tauri', 'src', 'app', 'bootstrap.rs'),
    'utf8',
  );

  assert.match(cargoToml, /tauri\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"tray-icon"/s);
  assert.equal(tauriConfig.bundle.active, true);
  assert.deepEqual(tauriConfig.bundle.icon, [
    'icons/32x32.png',
    'icons/128x128.png',
    'icons/128x128@2x.png',
    'icons/icon.ico',
    'icons/icon.icns',
  ]);

  assert.match(rustAssemblySource, /\.manage\(state::ShutdownIntent::default\(\)\)/);
  assert.match(rustAssemblySource, /\.setup\(app::bootstrap::setup\)/);
  assert.match(rustAssemblySource, /\.on_window_event\(app::bootstrap::handle_window_event\)/);

  assert.match(rustBootstrapSource, /TrayIconBuilder/);
  assert.match(rustBootstrapSource, /CloseRequested/);
  assert.match(rustBootstrapSource, /prevent_close\(\)/);
  assert.match(rustBootstrapSource, /window\.hide\(\)/);
  assert.match(rustBootstrapSource, /show_main_window/);
  assert.match(rustBootstrapSource, /TRAY_MENU_ID_OPEN_DRIVE/);
  assert.match(rustBootstrapSource, /TRAY_MENU_ID_OPEN_STARRED/);
  assert.match(rustBootstrapSource, /TRAY_MENU_ID_OPEN_RECENT/);
  assert.match(rustBootstrapSource, /TRAY_MENU_ID_OPEN_TRASH/);
  assert.match(rustBootstrapSource, /TRAY_MENU_ID_OPEN_SETTINGS/);
  assert.match(rustBootstrapSource, /tray:\/\/navigate/);
});
