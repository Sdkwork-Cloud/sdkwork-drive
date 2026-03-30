import { describe, expect, it } from 'vitest';
import type { DriveItem } from '../src/entities/drive.entity.ts';
import {
  buildPreviewFacts,
  resolveDriveEmptyStateMode,
} from '../src/utils/viewState.ts';

const SAMPLE_FILE: DriveItem = {
  id: 'file-1',
  parentId: 'folder-1',
  name: 'Roadmap.pdf',
  type: 'file',
  path: '/Design/Roadmap.pdf',
  size: 2048,
  mimeType: 'application/pdf',
  updatedAt: 1700000000000,
  createdAt: 1690000000000,
  isStarred: true,
  isShared: true,
};

describe('drive view state helpers', () => {
  it('chooses the right empty-state mode for search, filters, trash, and default views', () => {
    expect(
      resolveDriveEmptyStateMode({
        searchQuery: 'roadmap',
        filterType: 'all',
        isTrashView: false,
      }),
    ).toBe('search');

    expect(
      resolveDriveEmptyStateMode({
        searchQuery: '',
        filterType: 'image',
        isTrashView: false,
      }),
    ).toBe('filter');

    expect(
      resolveDriveEmptyStateMode({
        searchQuery: '',
        filterType: 'all',
        isTrashView: true,
      }),
    ).toBe('trash');

    expect(
      resolveDriveEmptyStateMode({
        searchQuery: '',
        filterType: 'all',
        isTrashView: false,
      }),
    ).toBe('default');
  });

  it('builds preview facts for files and folders', () => {
    expect(
      buildPreviewFacts(SAMPLE_FILE, {
        formatBytes: (value) => `${value} bytes`,
        formatDateTime: (value) => `date:${value}`,
      }),
    ).toEqual([
      { id: 'type', value: 'PDF' },
      { id: 'size', value: '2048 bytes' },
      { id: 'location', value: '/Design/Roadmap.pdf' },
      { id: 'updated', value: 'date:1700000000000' },
      { id: 'created', value: 'date:1690000000000' },
      { id: 'starred', value: 'true' },
      { id: 'shared', value: 'true' },
    ]);

    expect(
      buildPreviewFacts(
        {
          ...SAMPLE_FILE,
          type: 'folder',
          mimeType: undefined,
          size: 0,
          isShared: false,
          isStarred: false,
        },
        {
          formatBytes: (value) => `${value} bytes`,
          formatDateTime: (value) => `date:${value}`,
        },
      ),
    ).toEqual([
      { id: 'type', value: 'Folder' },
      { id: 'size', value: '--' },
      { id: 'location', value: '/Design/Roadmap.pdf' },
      { id: 'updated', value: 'date:1700000000000' },
      { id: 'created', value: 'date:1690000000000' },
      { id: 'starred', value: 'false' },
      { id: 'shared', value: 'false' },
    ]);
  });
});
