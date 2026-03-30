import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { createReleaseSdkBuildPlan } from './build-sdkwork-drive-release-sdks.mjs';

test('release sdk build plan builds common sdk before app sdk inside the prepared release workspace', () => {
  const workspaceRoot = path.resolve('D:/tmp/sdkwork-drive-release-workspace');
  const plan = createReleaseSdkBuildPlan({ workspaceRoot });

  assert.deepEqual(plan, [
    {
      workspaceRoot,
      packageName: '@sdkwork/sdk-common',
      command: 'pnpm',
      args: ['--dir', workspaceRoot, '--filter', '@sdkwork/sdk-common', 'build'],
    },
    {
      workspaceRoot,
      packageName: '@sdkwork/app-sdk',
      command: 'pnpm',
      args: ['--dir', workspaceRoot, '--filter', '@sdkwork/app-sdk', 'build'],
    },
  ]);
});
