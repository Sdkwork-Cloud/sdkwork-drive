#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const files = [
  'crates/sdkwork-router-drive-app-api/tests/command_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/observability_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/version_routes.rs',
  'crates/sdkwork-router-drive-app-api/tests/drive_routes.rs',
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authBlock =
  /\.header\(\s*\n\s*"authorization",[\s\S]*?\)\s*\n\s*\.header\(\s*"access-token",[\s\S]*?\)\s*/g;

for (const relativeFile of files) {
  const absolutePath = path.join(repoRoot, relativeFile);
  let source = fs.readFileSync(absolutePath, 'utf8');
  let previous;
  do {
    previous = source;
    source = source.replace(
      /(\.header\(\s*\n\s*"authorization",[\s\S]*?\)\s*\n\s*\.header\(\s*"access-token",[\s\S]*?\)\s*)\1+/g,
      '$1',
    );
  } while (source !== previous);
  fs.writeFileSync(absolutePath, source);
  process.stdout.write(`${relativeFile}: deduped auth headers\n`);
}
