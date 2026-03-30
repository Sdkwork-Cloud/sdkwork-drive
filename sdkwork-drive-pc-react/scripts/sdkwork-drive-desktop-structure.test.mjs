import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const desktopPackageDir = path.join(rootDir, 'packages', 'sdkwork-drive-desktop');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

test('workspace root exposes desktop development and tauri scripts', () => {
  const packageJson = readJson(path.join(rootDir, 'package.json'));

  assert.equal(packageJson.scripts['dev:desktop'], 'pnpm --filter @sdkwork/drive-desktop dev');
  assert.equal(packageJson.scripts['tauri:dev'], 'pnpm --filter @sdkwork/drive-desktop tauri:dev');
  assert.equal(packageJson.scripts['tauri:build'], 'pnpm --filter @sdkwork/drive-desktop tauri:build');
  assert.equal(packageJson.scripts['tauri:info'], 'pnpm --filter @sdkwork/drive-desktop tauri:info');
  assert.equal(packageJson.scripts['release:desktop'], 'node scripts/run-sdkwork-drive-desktop-release.mjs');
});

test('workspace includes a dedicated drive desktop package', () => {
  const requiredDesktopPaths = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'src/index.ts',
    'src/main.tsx',
    'src/vite-env.d.ts',
    'src/desktop/catalog.ts',
    'src/desktop/runtime.ts',
    'src/desktop/tauriBridge.ts',
    'src/desktop/providers/DesktopProviders.tsx',
    'src/desktop/bootstrap/createDesktopApp.tsx',
    'src/desktop/bootstrap/DesktopBootstrapApp.tsx',
    'src/desktop/bootstrap/DesktopTrayRouteBridge.tsx',
    'src-tauri/Cargo.toml',
    'src-tauri/build.rs',
    'src-tauri/tauri.conf.json',
    'src-tauri/app-icon.svg',
    'src-tauri/icons',
    'src-tauri/capabilities/default.json',
    'src-tauri/src/app',
    'src-tauri/src/app/bootstrap.rs',
    'src-tauri/src/app/mod.rs',
    'src-tauri/src/commands',
    'src-tauri/src/commands/app_info.rs',
    'src-tauri/src/commands/downloads.rs',
    'src-tauri/src/commands/filesystem.rs',
    'src-tauri/src/commands/mod.rs',
    'src-tauri/src/platform',
    'src-tauri/src/platform/mod.rs',
    'src-tauri/src/state',
    'src-tauri/src/state/mod.rs',
    'src-tauri/src/main.rs',
    'src-tauri/src/lib.rs',
  ];

  requiredDesktopPaths.forEach((relativePath) => {
    assert.equal(
      existsSync(path.join(desktopPackageDir, relativePath)),
      true,
      `Missing drive desktop path: packages/sdkwork-drive-desktop/${relativePath}`,
    );
  });

  const desktopPackageJson = readJson(path.join(desktopPackageDir, 'package.json'));
  assert.equal(desktopPackageJson.name, '@sdkwork/drive-desktop');
  assert.equal(desktopPackageJson.dependencies['@sdkwork/drive-shell'], 'workspace:*');
  assert.equal(desktopPackageJson.dependencies['@sdkwork/drive-core'], 'workspace:*');
  assert.ok(desktopPackageJson.dependencies['@tauri-apps/api']);
});

test('desktop host grants a capability set aligned with drive window bootstrap usage', () => {
  const capabilityJson = readJson(
    path.join(desktopPackageDir, 'src-tauri', 'capabilities', 'default.json'),
  );
  const runtimeSource = readFileSync(
    path.join(desktopPackageDir, 'src', 'desktop', 'runtime.ts'),
    'utf8',
  );
  const bootstrapSource = readFileSync(
    path.join(desktopPackageDir, 'src', 'desktop', 'bootstrap', 'DesktopBootstrapApp.tsx'),
    'utf8',
  );
  const appHeaderSource = readFileSync(
    path.join(rootDir, 'packages', 'sdkwork-drive-shell', 'src', 'components', 'AppHeader.tsx'),
    'utf8',
  );
  const createDesktopAppSource = readFileSync(
    path.join(
      desktopPackageDir,
      'src',
      'desktop',
      'bootstrap',
      'createDesktopApp.tsx',
    ),
    'utf8',
  );
  const tauriConfig = readJson(path.join(desktopPackageDir, 'src-tauri', 'tauri.conf.json'));

  assert.equal(capabilityJson.identifier, 'default');
  assert.deepEqual(capabilityJson.windows, ['main']);
  assert.ok(Array.isArray(capabilityJson.permissions));
  assert.match(capabilityJson.description, /title bar|window|desktop/i);

  assert.match(runtimeSource, /listen(?:<[^>]+>)?\(/);
  assert.match(runtimeSource, /isTauri/);
  assert.match(runtimeSource, /__TAURI_INTERNALS__/);
  assert.match(runtimeSource, /typeof tauriInternals\.invoke === 'function'/);
  assert.equal(tauriConfig.app?.withGlobalTauri, undefined);
  assert.match(bootstrapSource, /desktopWindow\.show\(\)/);
  assert.match(bootstrapSource, /desktopWindow\.setFocus\(\)/);
  assert.match(bootstrapSource, /desktopWindow\s*\.\s*setFullscreen\(false\)/);
  assert.match(bootstrapSource, /desktopWindow\s*\.\s*isMaximized\(\)/);
  assert.match(bootstrapSource, /desktopWindow\s*\.\s*unmaximize\(\)/);
  assert.match(bootstrapSource, /data-app-platform/);
  assert.match(bootstrapSource, /setAttribute\('data-app-platform', 'desktop'\)/);
  assert.match(appHeaderSource, /DesktopWindowControls/);
  assert.match(appHeaderSource, /variant="header"/);
  assert.match(appHeaderSource, /data-tauri-drag-region/);
  assert.match(appHeaderSource, /data-tauri-drag-region="false"/);
  assert.match(appHeaderSource, /h-12/);
  assert.doesNotMatch(appHeaderSource, /<header[^>]*data-tauri-drag-region/);
  assert.doesNotMatch(createDesktopAppSource, /StrictMode/);
  assert.equal(tauriConfig.app?.windows?.[0]?.decorations, false);
  assert.equal(tauriConfig.app?.windows?.[0]?.visible, false);
  assert.equal(tauriConfig.app?.windows?.[0]?.fullscreen, false);
  assert.equal(tauriConfig.app?.windows?.[0]?.height, 900);

  const requiredPermissions = [
    'core:default',
    'core:window:allow-close',
    'core:window:allow-hide',
    'core:window:allow-internal-toggle-maximize',
    'core:window:allow-is-fullscreen',
    'core:window:allow-is-maximized',
    'core:window:allow-is-minimized',
    'core:window:allow-is-visible',
    'core:window:allow-maximize',
    'core:window:allow-minimize',
    'core:window:allow-set-fullscreen',
    'core:window:allow-show',
    'core:window:allow-start-dragging',
    'core:window:allow-set-focus',
    'core:window:allow-toggle-maximize',
    'core:window:allow-unmaximize',
    'core:window:allow-unminimize',
  ];

  for (const permission of requiredPermissions) {
    assert.ok(
      capabilityJson.permissions.includes(permission),
      `expected drive desktop capability to include ${permission}`,
    );
  }
});
