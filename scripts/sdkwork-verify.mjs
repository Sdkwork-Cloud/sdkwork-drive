#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

const steps = [
  ['format:rust:check', [pnpmCommand(), ['format:rust:check']]],
  ['test', [pnpmCommand(), ['test']]],
  ['lint', [pnpmCommand(), ['lint']]],
  ['typecheck', [pnpmCommand(), ['typecheck']]],
  ['test:pc', [pnpmCommand(), ['test:pc']]],
  ['check:dependency-management', [pnpmCommand(), ['check:dependency-management']]],
  ['check:app-sdk-consumers', [pnpmCommand(), ['check:app-sdk-consumers']]],
  ['check:pc-standard', [pnpmCommand(), ['check:pc-standard']]],
  ['check:package-standard', [pnpmCommand(), ['check:package-standard']]],
  ['check:architecture-alignment', [pnpmCommand(), ['check:architecture-alignment']]],
  ['test:app-openapi-context', [pnpmCommand(), ['test:app-openapi-context']]],
  ['sbom:generate', [pnpmCommand(), ['sbom:generate']]],
  ['check:pnpm-script-standard', [pnpmCommand(), ['check:pnpm-script-standard']]],
  ['check:agent-workflow-standard', [pnpmCommand(), ['check:agent-workflow-standard']]],
];

for (const [label, [command, args]] of steps) {
  console.log(`[sdkwork-drive] verify ${label}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    windowsHide: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
