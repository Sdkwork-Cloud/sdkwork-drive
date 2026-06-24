import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { configureDrivePcSdkPorts, getDrivePcSdkPorts } from '../src/sdkPorts';

const packageRoot = path.resolve(__dirname, '..');

function listSourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const absolute = path.join(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(absolute));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(absolute);
    }
  }
  return files;
}

describe('sdkwork-drive-pc-drive host module contract', () => {
  it('uses canonical package identity and host SDK ports', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    ) as { name?: string };

    expect(packageJson.name).toBe('sdkwork-drive-pc-drive');
    expect(() => getDrivePcSdkPorts()).toThrow(/not configured/i);
    configureDrivePcSdkPorts({
      getDriveClient: () => ({ operationId: 'host-managed-drive-client' }),
      readHostSession: () => null,
    });
    expect(getDrivePcSdkPorts().getDriveClient()).toEqual({
      operationId: 'host-managed-drive-client',
    });
  });

  it('does not use raw HTTP in authored package sources', () => {
    const srcRoot = path.join(packageRoot, 'src');
    expect(existsSync(srcRoot)).toBe(true);
    const combined = listSourceFiles(srcRoot)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(combined).not.toMatch(/\bfetch\s*\(/);
    expect(combined).not.toContain('../../../src/index.css');
  });
});
