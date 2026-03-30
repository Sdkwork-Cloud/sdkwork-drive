import { describe, expect, it } from 'vitest';
import * as viewState from '../src/utils/viewState.ts';
import type { DriveItem } from '../src/entities/drive.entity.ts';

const FILE_ITEM: DriveItem = {
  id: 'file-1',
  parentId: 'folder-1',
  name: 'Quarterly Report.pdf',
  type: 'file',
  path: '/Reports/Q1/Quarterly Report.pdf',
  size: 8192,
  mimeType: 'application/pdf',
  updatedAt: 1700000000000,
  createdAt: 1690000000000,
  isStarred: true,
  isShared: true,
};

describe('preview presentation helpers', () => {
  it('keeps high-signal preview facts in a professional scan order', () => {
    const facts = viewState.buildPreviewFacts(FILE_ITEM, {
      formatBytes: () => '8 KB',
      formatDateTime: (value) => `time-${value}`,
    });

    expect((viewState as any).buildPreviewHighlightFacts(facts)).toEqual([
      { id: 'type', value: 'PDF' },
      { id: 'size', value: '8 KB' },
      { id: 'updated', value: 'time-1700000000000' },
      { id: 'location', value: '/Reports/Q1/Quarterly Report.pdf' },
    ]);
  });

  it('resolves the reveal path for files and folders correctly', () => {
    expect((viewState as any).resolvePreviewRevealPath(FILE_ITEM)).toBe('/Reports/Q1');
    expect(
      (viewState as any).resolvePreviewRevealPath({
        ...FILE_ITEM,
        id: 'folder-2',
        name: 'Reports',
        type: 'folder',
        path: '/Reports',
      }),
    ).toBe('/Reports');
  });

  it('builds status flag identifiers from item sharing state', () => {
    expect((viewState as any).buildPreviewStatusFlagIds(FILE_ITEM)).toEqual([
      'starred',
      'shared',
    ]);
    expect(
      (viewState as any).buildPreviewStatusFlagIds({
        ...FILE_ITEM,
        isStarred: false,
        isShared: false,
      }),
    ).toEqual([]);
  });
});
