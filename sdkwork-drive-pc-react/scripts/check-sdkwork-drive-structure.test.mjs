import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditWorkspace } from './check-sdkwork-drive-structure.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

test('sdkwork-drive workspace matches the expected package structure and boundaries', () => {
  const result = auditWorkspace(rootDir);
  assert.deepEqual(result.issues, []);
});
