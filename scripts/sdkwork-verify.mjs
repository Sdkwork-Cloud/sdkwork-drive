#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

const steps = [
  ['test', [pnpmCommand(), ['test']]],
  ['typecheck', [pnpmCommand(), ['typecheck']]],
  ['test:pc', [pnpmCommand(), ['test:pc']]],
  ['check', [pnpmCommand(), ['check']]],
  ['api:check', [pnpmCommand(), ['api:check']]],
  ['test:app-openapi-context', [pnpmCommand(), ['test:app-openapi-context']]],
  ['test:app-sdk-smoke', [pnpmCommand(), ['test:app-sdk-smoke']]],
  ['test:global-assets-contract', [pnpmCommand(), ['test:global-assets-contract']]],
  ['test:drive-integration', [pnpmCommand(), ['test:drive-integration']]],
  ['test:drive-share-link-integration', [pnpmCommand(), ['test:drive-share-link-integration']]],
  ['test:drive-e2e', [pnpmCommand(), ['test:drive-e2e']]],
  ['test:e2e', [pnpmCommand(), ['test:e2e']]],
  ['test:release-evidence', [pnpmCommand(), ['test:release-evidence']]],
  ['sdk:check', [pnpmCommand(), ['sdk:check']]],
];

for (const [label, [command, args]] of steps) {
  console.log(`[sdkwork-drive] verify ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    windowsHide: process.platform === 'win32',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
