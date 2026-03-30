import { describe, expect, it } from 'vitest';
import type { DriveItem } from '../src/entities/drive.entity.ts';
import {
  DEFAULT_DRIVE_VIEW_PREFERENCES,
  buildDriveBreadcrumbs,
  createDriveLoadRequestTracker,
  buildSelectionRange,
  filterDriveItems,
  getSelectedItemsTotalBytes,
  readDriveViewPreferences,
  resolveNextSortState,
  sortDriveItems,
  writeDriveViewPreferences,
  type FileTypeFilter,
  type SortDirection,
  type SortOption,
} from '../src/store/driveStore.helpers.ts';

const SAMPLE_ITEMS: DriveItem[] = [
  {
    id: 'folder-1',
    parentId: null,
    name: 'Design',
    type: 'folder',
    path: '/Design',
    size: 0,
    updatedAt: 300,
    createdAt: 100,
  },
  {
    id: 'file-1',
    parentId: 'folder-1',
    name: 'Roadmap.pdf',
    type: 'file',
    path: '/Design/Roadmap.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    updatedAt: 250,
    createdAt: 150,
  },
  {
    id: 'file-2',
    parentId: 'folder-1',
    name: 'Hero.png',
    type: 'file',
    path: '/Design/Hero.png',
    size: 2048,
    mimeType: 'image/png',
    updatedAt: 400,
    createdAt: 160,
  },
  {
    id: 'file-3',
    parentId: null,
    name: 'index.ts',
    type: 'file',
    path: '/index.ts',
    size: 128,
    mimeType: 'text/typescript',
    updatedAt: 180,
    createdAt: 80,
  },
];

describe('driveStore.helpers', () => {
  it('keeps folders ahead of files when sorting by name ascending', () => {
    const result = sortDriveItems(SAMPLE_ITEMS, 'name', 'asc');

    expect(result.map((item) => item.name)).toEqual([
      'Design',
      'Hero.png',
      'index.ts',
      'Roadmap.pdf',
    ]);
  });

  it('filters files by type and search query', () => {
    const imageOnly = filterDriveItems(SAMPLE_ITEMS, {
      filterType: 'image',
      searchQuery: '',
    });
    const searched = filterDriveItems(SAMPLE_ITEMS, {
      filterType: 'all',
      searchQuery: 'road',
    });

    expect(imageOnly.map((item) => item.name)).toEqual(['Design', 'Hero.png']);
    expect(searched.map((item) => item.name)).toEqual(['Roadmap.pdf']);
  });

  it('builds breadcrumbs for normal and virtual paths', () => {
    expect(buildDriveBreadcrumbs('/Design/Brand')).toEqual([
      { label: 'My Drive', path: '/' },
      { label: 'Design', path: '/Design' },
      { label: 'Brand', path: '/Design/Brand' },
    ]);

    expect(buildDriveBreadcrumbs('virtual://trash')).toEqual([
      { label: 'Trash', path: 'virtual://trash' },
    ]);
  });

  it('builds a contiguous selection range from the active anchor', () => {
    expect(
      buildSelectionRange(
        SAMPLE_ITEMS.map((item) => item.id),
        'folder-1',
        'file-2',
      ),
    ).toEqual(['folder-1', 'file-1', 'file-2']);

    expect(
      buildSelectionRange(
        SAMPLE_ITEMS.map((item) => item.id),
        'file-2',
        'folder-1',
      ),
    ).toEqual(['folder-1', 'file-1', 'file-2']);

    expect(
      buildSelectionRange(
        SAMPLE_ITEMS.map((item) => item.id),
        null,
        'file-3',
      ),
    ).toEqual(['file-3']);
  });

  it('applies column-aware default directions when switching sort columns', () => {
    expect(resolveNextSortState('name', 'asc', 'date')).toEqual({
      sortBy: 'date',
      sortDirection: 'desc',
    });

    expect(resolveNextSortState('date', 'desc', 'size')).toEqual({
      sortBy: 'size',
      sortDirection: 'desc',
    });

    expect(resolveNextSortState('size', 'asc', 'name')).toEqual({
      sortBy: 'name',
      sortDirection: 'asc',
    });
  });

  it('toggles direction when the active sort header is clicked repeatedly', () => {
    expect(resolveNextSortState('name', 'asc', 'name')).toEqual({
      sortBy: 'name',
      sortDirection: 'desc',
    });

    expect(resolveNextSortState('date', 'desc', 'date')).toEqual({
      sortBy: 'date',
      sortDirection: 'asc',
    });
  });

  it('sums the selected file bytes without inflating folder rows', () => {
    expect(getSelectedItemsTotalBytes([SAMPLE_ITEMS[0], SAMPLE_ITEMS[1], SAMPLE_ITEMS[2]])).toBe(3072);
    expect(getSelectedItemsTotalBytes([SAMPLE_ITEMS[0]])).toBe(0);
    expect(getSelectedItemsTotalBytes([])).toBe(0);
  });

  it('falls back to default drive view preferences when storage is missing or invalid', () => {
    expect(readDriveViewPreferences(null)).toEqual(DEFAULT_DRIVE_VIEW_PREFERENCES);
    expect(readDriveViewPreferences({
      getItem: () => '{invalid',
    })).toEqual(DEFAULT_DRIVE_VIEW_PREFERENCES);
  });

  it('sanitizes persisted drive view preferences and ignores unknown values', () => {
    const stored = JSON.stringify({
      viewMode: 'list',
      sortBy: 'date',
      sortDirection: 'desc',
      filterType: 'image',
      extra: 'ignored',
    });

    expect(readDriveViewPreferences({
      getItem: () => stored,
    })).toEqual({
      viewMode: 'list',
      sortBy: 'date',
      sortDirection: 'desc',
      filterType: 'image',
    });

    expect(readDriveViewPreferences({
      getItem: () => JSON.stringify({
        viewMode: 'gallery',
        sortBy: 'owner',
        sortDirection: 'down',
        filterType: 'weird',
      }),
    })).toEqual(DEFAULT_DRIVE_VIEW_PREFERENCES);
  });

  it('writes sanitized drive view preferences to storage', () => {
    const writes: string[] = [];

    writeDriveViewPreferences(
      {
        viewMode: 'list',
        sortBy: 'size',
        sortDirection: 'desc',
        filterType: 'video',
      },
      {
        setItem: (_key, value) => writes.push(value),
      },
    );

    expect(writes).toEqual([
      JSON.stringify({
        viewMode: 'list',
        sortBy: 'size',
        sortDirection: 'desc',
        filterType: 'video',
      }),
    ]);
  });

  it('swallows storage access failures when reading and writing view preferences', () => {
    expect(readDriveViewPreferences({
      getItem: () => {
        throw new Error('blocked');
      },
    })).toEqual(DEFAULT_DRIVE_VIEW_PREFERENCES);

    expect(() => writeDriveViewPreferences(
      DEFAULT_DRIVE_VIEW_PREFERENCES,
      {
        setItem: () => {
          throw new Error('blocked');
        },
      },
    )).not.toThrow();
  });

  it('marks only the latest drive load request as current', () => {
    const tracker = createDriveLoadRequestTracker();

    const firstRequest = tracker.begin();
    const secondRequest = tracker.begin();

    expect(tracker.isCurrent(firstRequest)).toBe(false);
    expect(tracker.isCurrent(secondRequest)).toBe(true);
  });
});

void ([
  ['name', 'date', 'size'] as SortOption[],
  ['asc', 'desc'] as SortDirection[],
  ['all', 'image', 'document'] as FileTypeFilter[],
]);
