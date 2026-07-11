#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const commandPath = path.join(repoRoot, 'scripts/sdkwork-command.mjs');

function runCommand(args) {
  return spawnSync(process.execPath, [commandPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      SDKWORK_DRIVE_PLATFORM_API_GATEWAY_AUTOSTART: 'false',
      SDKWORK_DRIVE_STANDALONE_GATEWAY_CONFIG:
        'configs/sdkwork-drive-standalone-gateway.development.toml.example',
    },
  });
}

{
  const result = runCommand([
    'dev',
    '--runtime-target',
    'browser',
    '--database',
    'postgres',
    '--deployment-profile',
    'cloud',
    '--dry-run',
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /deploymentProfile=cloud/);
  assert.match(result.stdout, /environment=development/);
  assert.match(result.stdout, /SDKWORK_DRIVE_PROFILE_ID=cloud\.development/);
  assert.match(result.stdout, /sdkwork-api-cloud-gateway/);
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
