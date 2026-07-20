#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const commandPath = path.join(repoRoot, 'scripts/sdkwork-command.mjs');
const appCommandPath = path.resolve(repoRoot, '..', 'sdkwork-app-topology', 'scripts', 'sdkwork-app.mjs');

function runCommand(args) {
  return spawnSync(process.execPath, [commandPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      SDKWORK_DRIVE_PLATFORM_API_GATEWAY_AUTOSTART: 'false',
      SDKWORK_DRIVE_STANDALONE_GATEWAY_CONFIG:
        'etc/sdkwork-api-drive-standalone-gateway.development.toml.example',
    },
  });
}

{
  const result = spawnSync(process.execPath, [
    appCommandPath,
    'dev',
    '--runtime-target', 'browser',
    '--deployment-profile', 'cloud',
    '--environment', 'development',
    '--dry-run',
  ], { cwd: repoRoot, encoding: 'utf8', env: process.env });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /cloud\.development/);
  assert.match(result.stdout, /drive-browser/);
  assert.doesNotMatch(result.stdout, /"role": "(?:standalone-gateway|application-cloud-gateway|platform-gateway|api-listener|database|redis|migration|seed|worker)"/u);
}

{
  const result = runCommand([
    'dev',
    '--runtime-target',
    'browser',
    '--database',
    'postgres',
    '--deployment-profile',
    'standalone',
    '--service-layout',
    'split-services',
    '--dry-run',
  ]);

  assert.notEqual(result.status, 0, 'public sdkwork-command dispatcher must reject --service-layout');
  assert.match(result.stderr, /--service-layout is internal topology detail/);
}

{
  const result = runCommand(['release:plan']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.doesNotMatch(result.stderr, /TypeError: scriptArgs is not iterable/);
}

{
  const commandSource = readFileSync(commandPath, 'utf8');

  assert.doesNotMatch(
    commandSource,
    /gateway-standalone-pack\.mjs",\s*\[\s*"package",\s*"--skip-build"\s*\]/,
    'release:package must build the standalone gateway binary instead of assuming a pre-existing local target/release binary',
  );
}

console.log('sdkwork-command-dev-topology.contract.test.mjs passed');
