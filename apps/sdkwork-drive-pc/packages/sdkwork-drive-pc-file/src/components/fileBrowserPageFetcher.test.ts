import { describe, expect, it } from 'vitest';
import type { DriveFile } from 'sdkwork-drive-pc-types';
import {
  isDefaultFileBrowserSort,
  mergeUniqueDriveFiles,
} from './fileBrowserPageFetcher';

function makeFile(id: string): DriveFile {
  return {
    id,
    name: id,
    type: 'file',
    ownerId: 'owner',
    updatedAt: '2026-01-01T00:00:00.000Z',
    size: 1,
  };
}

describe('fileBrowserPageFetcher', () => {
  it('detects default name ascending sort', () => {
    expect(isDefaultFileBrowserSort('name', 'asc')).toBe(true);
    expect(isDefaultFileBrowserSort('size', 'asc')).toBe(false);
  });

  it('merges pages without duplicate ids', () => {
    const merged = mergeUniqueDriveFiles(
      [makeFile('a')],
      [makeFile('a'), makeFile('b')],
    );
    expect(merged.map((file) => file.id)).toEqual(['a', 'b']);
  });
});
