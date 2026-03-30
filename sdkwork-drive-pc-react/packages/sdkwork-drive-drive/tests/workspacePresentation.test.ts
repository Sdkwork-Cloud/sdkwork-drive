import { describe, expect, it } from 'vitest';
import type { DriveItem, DriveStats } from '../src/entities/drive.entity.ts';
import {
  buildDriveDetailsPanelModel,
  buildDriveWorkspaceSummary,
  resolveDriveViewKind,
} from '../src/utils/workspacePresentation.ts';

const SAMPLE_ITEMS: DriveItem[] = [
  {
    id: 'folder-1',
    parentId: null,
    name: 'Design',
    type: 'folder',
    path: '/Design',
    size: 0,
    updatedAt: 1700000000000,
    createdAt: 1690000000000,
    isStarred: true,
  },
  {
    id: 'file-1',
    parentId: 'folder-1',
    name: 'Roadmap.pdf',
    type: 'file',
    path: '/Design/Roadmap.pdf',
    size: 2048,
    mimeType: 'application/pdf',
    updatedAt: 1701000000000,
    createdAt: 1691000000000,
    isStarred: true,
    isShared: true,
  },
  {
    id: 'file-2',
    parentId: null,
    name: 'Sprint Notes.md',
    type: 'file',
    path: '/Sprint Notes.md',
    size: 1024,
    mimeType: 'text/markdown',
    updatedAt: 1702000000000,
    createdAt: 1692000000000,
    isStarred: false,
  },
];

const SAMPLE_STATS: DriveStats = {
  usedBytes: 3_145_728,
  totalBytes: 10_485_760,
  fileCount: 42,
};

describe('workspace presentation helpers', () => {
  it('resolves the correct virtual drive view kind', () => {
    expect(resolveDriveViewKind('/')).toBe('drive');
    expect(resolveDriveViewKind('/Projects')).toBe('drive');
    expect(resolveDriveViewKind('virtual://starred')).toBe('starred');
    expect(resolveDriveViewKind('virtual://recent')).toBe('recent');
    expect(resolveDriveViewKind('virtual://trash')).toBe('trash');
  });

  it('builds a workspace summary with item, selection, and usage insights', () => {
    expect(
      buildDriveWorkspaceSummary({
        currentPath: 'virtual://starred',
        items: SAMPLE_ITEMS,
        selectedItems: [SAMPLE_ITEMS[1]],
        searchQuery: 'roadmap',
        filterType: 'document',
        stats: SAMPLE_STATS,
      }),
    ).toEqual({
      viewKind: 'starred',
      resultCount: 3,
      fileCount: 2,
      folderCount: 1,
      starredCount: 2,
      selectedCount: 1,
      selectedTotalBytes: 2048,
      hasActiveSearch: true,
      hasActiveFilter: true,
      usagePercent: 30,
      usedBytes: 3_145_728,
      totalBytes: 10_485_760,
    });
  });

  it('builds an overview-side panel model when nothing is selected', () => {
    expect(
      buildDriveDetailsPanelModel({
        currentPath: 'virtual://recent',
        items: SAMPLE_ITEMS,
        selectedItems: [],
        searchQuery: '',
        filterType: 'all',
        stats: SAMPLE_STATS,
      }),
    ).toEqual({
      mode: 'overview',
      viewKind: 'recent',
      resultCount: 3,
      fileCount: 2,
      folderCount: 1,
      canCreateContent: false,
      hasActiveSearch: false,
      hasActiveFilter: false,
      usagePercent: 30,
      usedBytes: 3_145_728,
      totalBytes: 10_485_760,
      selectedCount: 0,
      selectedTotalBytes: 0,
      recommendation: {
        tone: 'primary',
        titleKey: 'drive.details.recommendations.recent.title',
        descriptionKey: 'drive.details.recommendations.recent.description',
        actionId: null,
      },
      focusItems: [
        {
          id: 'file-2',
          name: 'Sprint Notes.md',
          path: '/Sprint Notes.md',
          type: 'file',
          reason: 'recent',
        },
        {
          id: 'file-1',
          name: 'Roadmap.pdf',
          path: '/Design/Roadmap.pdf',
          type: 'file',
          reason: 'recent',
        },
        {
          id: 'folder-1',
          name: 'Design',
          path: '/Design',
          type: 'folder',
          reason: 'recent',
        },
      ],
    });
  });

  it('builds a selection-side panel model for multi-select operations', () => {
    expect(
      buildDriveDetailsPanelModel({
        currentPath: '/',
        items: SAMPLE_ITEMS,
        selectedItems: [SAMPLE_ITEMS[0], SAMPLE_ITEMS[2]],
        searchQuery: '',
        filterType: 'all',
        stats: SAMPLE_STATS,
      }),
    ).toEqual({
      mode: 'selection',
      viewKind: 'drive',
      selectedCount: 2,
      folderCount: 1,
      fileCount: 1,
      selectedTotalBytes: 1024,
      canCreateContent: true,
      hasActiveSearch: false,
      hasActiveFilter: false,
      recommendation: {
        tone: 'primary',
        titleKey: 'drive.details.recommendations.selection.title',
        descriptionKey: 'drive.details.recommendations.selection.description',
        actionId: null,
      },
      focusItems: [
        {
          id: 'folder-1',
          name: 'Design',
          path: '/Design',
          type: 'folder',
          reason: 'selected',
        },
        {
          id: 'file-2',
          name: 'Sprint Notes.md',
          path: '/Sprint Notes.md',
          type: 'file',
          reason: 'selected',
        },
      ],
    });
  });

  it('prioritizes shared and starred work in the main drive overview', () => {
    const model = buildDriveDetailsPanelModel({
      currentPath: '/',
      items: SAMPLE_ITEMS,
      selectedItems: [],
      searchQuery: '',
      filterType: 'all',
      stats: SAMPLE_STATS,
    });

    expect(model.mode).toBe('overview');
    if (model.mode !== 'overview') {
      throw new Error('expected overview details mode');
    }

    expect(model.canCreateContent).toBe(true);
    expect(model.recommendation).toEqual({
      tone: 'default',
      titleKey: 'drive.details.recommendations.organize.title',
      descriptionKey: 'drive.details.recommendations.organize.description',
      actionId: 'createFolder',
    });
    expect(model.focusItems).toEqual([
      {
        id: 'file-1',
        name: 'Roadmap.pdf',
        path: '/Design/Roadmap.pdf',
        type: 'file',
        reason: 'shared',
      },
      {
        id: 'folder-1',
        name: 'Design',
        path: '/Design',
        type: 'folder',
        reason: 'starred',
      },
      {
        id: 'file-2',
        name: 'Sprint Notes.md',
        path: '/Sprint Notes.md',
        type: 'file',
        reason: 'recent',
      },
    ]);
  });

  it('builds an item-side panel model for single item focus', () => {
    const model = buildDriveDetailsPanelModel({
      currentPath: '/',
      items: SAMPLE_ITEMS,
      selectedItems: [SAMPLE_ITEMS[1]],
      searchQuery: '',
      filterType: 'all',
      stats: SAMPLE_STATS,
      formatBytes: (value) => `${value} bytes`,
      formatDateTime: (value) => `date:${value}`,
    });

    expect(model.mode).toBe('item');
    if (model.mode !== 'item') {
      throw new Error('expected item details mode');
    }

    expect(model.viewKind).toBe('drive');
    expect(model.item.id).toBe('file-1');
    expect(model.facts).toEqual([
      { id: 'type', value: 'PDF' },
      { id: 'size', value: '2048 bytes' },
      { id: 'location', value: '/Design/Roadmap.pdf' },
      { id: 'updated', value: 'date:1701000000000' },
      { id: 'created', value: 'date:1691000000000' },
      { id: 'starred', value: 'true' },
      { id: 'shared', value: 'true' },
    ]);
  });
});
