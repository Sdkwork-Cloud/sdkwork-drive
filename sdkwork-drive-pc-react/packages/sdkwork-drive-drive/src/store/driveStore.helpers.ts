import type { DriveItem } from '../entities/drive.entity.ts';
import { pathUtils } from '@sdkwork/drive-commons';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'date' | 'size';
export type SortDirection = 'asc' | 'desc';
export type FileTypeFilter =
  | 'all'
  | 'document'
  | 'sheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'font'
  | '3d';

export interface DriveBreadcrumb {
  label: string;
  path: string;
}

export interface FilterDriveItemsOptions {
  filterType: FileTypeFilter;
  searchQuery: string;
}

export interface DriveViewPreferences {
  viewMode: ViewMode;
  sortBy: SortOption;
  sortDirection: SortDirection;
  filterType: FileTypeFilter;
}

export interface DriveLoadRequestTracker {
  begin: () => number;
  isCurrent: (requestId: number) => boolean;
}

type DriveViewPreferenceReader = Pick<Storage, 'getItem'> | null;
type DriveViewPreferenceWriter = Pick<Storage, 'setItem'> | null;

const SORT_DEFAULT_DIRECTIONS: Record<SortOption, SortDirection> = {
  name: 'asc',
  date: 'desc',
  size: 'desc',
};

const DRIVE_VIEW_PREFERENCES_STORAGE_KEY = 'sdkwork-drive-view-preferences';

export const DEFAULT_DRIVE_VIEW_PREFERENCES: DriveViewPreferences = {
  viewMode: 'grid',
  sortBy: 'name',
  sortDirection: 'asc',
  filterType: 'all',
};

export function createDriveLoadRequestTracker(): DriveLoadRequestTracker {
  let currentRequestId = 0;

  return {
    begin() {
      currentRequestId += 1;
      return currentRequestId;
    },
    isCurrent(requestId) {
      return requestId === currentRequestId;
    },
  };
}

const VIRTUAL_LABELS: Record<string, string> = {
  'virtual://starred': 'Starred',
  'virtual://recent': 'Recent',
  'virtual://trash': 'Trash',
};

function isViewMode(value: unknown): value is ViewMode {
  return value === 'grid' || value === 'list';
}

function isSortOption(value: unknown): value is SortOption {
  return value === 'name' || value === 'date' || value === 'size';
}

function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function isFileTypeFilter(value: unknown): value is FileTypeFilter {
  return value === 'all'
    || value === 'document'
    || value === 'sheet'
    || value === 'presentation'
    || value === 'image'
    || value === 'video'
    || value === 'audio'
    || value === 'archive'
    || value === 'code'
    || value === 'font'
    || value === '3d';
}

function sanitizeDriveViewPreferences(input: unknown): DriveViewPreferences {
  const candidate = (input && typeof input === 'object') ? input as Partial<DriveViewPreferences> : {};

  return {
    viewMode: isViewMode(candidate.viewMode)
      ? candidate.viewMode
      : DEFAULT_DRIVE_VIEW_PREFERENCES.viewMode,
    sortBy: isSortOption(candidate.sortBy)
      ? candidate.sortBy
      : DEFAULT_DRIVE_VIEW_PREFERENCES.sortBy,
    sortDirection: isSortDirection(candidate.sortDirection)
      ? candidate.sortDirection
      : DEFAULT_DRIVE_VIEW_PREFERENCES.sortDirection,
    filterType: isFileTypeFilter(candidate.filterType)
      ? candidate.filterType
      : DEFAULT_DRIVE_VIEW_PREFERENCES.filterType,
  };
}

function getDriveViewPreferenceStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  return null;
}

function matchesFileType(item: DriveItem, filterType: FileTypeFilter) {
  if (filterType === 'all' || item.type === 'folder') {
    return true;
  }

  const name = item.name.toLowerCase();
  const mimeType = (item.mimeType || '').toLowerCase();

  switch (filterType) {
    case 'image':
      return mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico|tiff)$/.test(name);
    case 'video':
      return mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(name);
    case 'audio':
      return mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/.test(name);
    case 'document':
      return mimeType.includes('pdf') || mimeType.startsWith('text/') || /\.(pdf|doc|docx|txt|md|rtf|odt)$/.test(name);
    case 'sheet':
      return /\.(xls|xlsx|csv|tsv|ods)$/.test(name);
    case 'presentation':
      return /\.(ppt|pptx|odp)$/.test(name);
    case 'archive':
      return mimeType.includes('zip') || mimeType.includes('compressed') || /\.(zip|tar|gz|rar|7z)$/.test(name);
    case 'code':
      return /\.(ts|tsx|js|jsx|json|html|css|py|rs|go|java|c|cpp|h|xml|yaml|yml|sh|bat)$/.test(name);
    case 'font':
      return /\.(ttf|otf|woff|woff2|eot)$/.test(name);
    case '3d':
      return /\.(obj|fbx|glb|gltf|stl|blend)$/.test(name);
    default:
      return true;
  }
}

function matchesSearchQuery(item: DriveItem, searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    item.name,
    item.path,
    item.mimeType,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

export function filterDriveItems(items: DriveItem[], options: FilterDriveItemsOptions) {
  return items.filter((item) => {
    return matchesFileType(item, options.filterType) && matchesSearchQuery(item, options.searchQuery);
  });
}

export function sortDriveItems(items: DriveItem[], sortBy: SortOption, sortDirection: SortDirection) {
  const sortedItems = [...items].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'folder' ? -1 : 1;
    }

    let comparison = 0;
    if (sortBy === 'size') {
      comparison = left.size - right.size;
    } else if (sortBy === 'date') {
      comparison = left.updatedAt - right.updatedAt;
    } else {
      comparison = left.name.localeCompare(right.name);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return sortedItems;
}

export function resolveNextSortState(
  currentSortBy: SortOption,
  currentSortDirection: SortDirection,
  nextSortBy: SortOption,
) {
  if (currentSortBy === nextSortBy) {
    return {
      sortBy: nextSortBy,
      sortDirection: currentSortDirection === 'asc' ? 'desc' : 'asc',
    } satisfies { sortBy: SortOption; sortDirection: SortDirection };
  }

  return {
    sortBy: nextSortBy,
    sortDirection: SORT_DEFAULT_DIRECTIONS[nextSortBy],
  } satisfies { sortBy: SortOption; sortDirection: SortDirection };
}

export function getSelectedItemsTotalBytes(items: DriveItem[]) {
  return items.reduce((total, item) => {
    if (item.type !== 'file' || !Number.isFinite(item.size) || item.size <= 0) {
      return total;
    }

    return total + item.size;
  }, 0);
}

export function readDriveViewPreferences(storage: DriveViewPreferenceReader = getDriveViewPreferenceStorage()) {
  let rawValue = '';
  try {
    rawValue = storage?.getItem(DRIVE_VIEW_PREFERENCES_STORAGE_KEY) || '';
  } catch {
    return DEFAULT_DRIVE_VIEW_PREFERENCES;
  }

  if (!rawValue) {
    return DEFAULT_DRIVE_VIEW_PREFERENCES;
  }

  try {
    return sanitizeDriveViewPreferences(JSON.parse(rawValue));
  } catch {
    return DEFAULT_DRIVE_VIEW_PREFERENCES;
  }
}

export function writeDriveViewPreferences(
  preferences: DriveViewPreferences,
  storage: DriveViewPreferenceWriter = getDriveViewPreferenceStorage(),
) {
  try {
    storage?.setItem(
      DRIVE_VIEW_PREFERENCES_STORAGE_KEY,
      JSON.stringify(sanitizeDriveViewPreferences(preferences)),
    );
  } catch {
    // Persisted view preferences are best-effort only.
  }
}

export function buildDriveBreadcrumbs(path: string): DriveBreadcrumb[] {
  if (path.startsWith('virtual://')) {
    return [
      {
        label: VIRTUAL_LABELS[path] || 'View',
        path,
      },
    ];
  }

  const normalizedPath = path && path !== '/' ? path.replace(/\/+$/g, '') : '/';
  if (normalizedPath === '/') {
    return [{ label: 'My Drive', path: '/' }];
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  const breadcrumbs: DriveBreadcrumb[] = [{ label: 'My Drive', path: '/' }];

  segments.forEach((segment, index) => {
    breadcrumbs.push({
      label: decodeURIComponent(segment),
      path: `/${segments.slice(0, index + 1).join('/')}`,
    });
  });

  return breadcrumbs;
}

export function buildSelectionRange(
  orderedIds: string[],
  anchorId: string | null | undefined,
  targetId: string,
) {
  const targetIndex = orderedIds.indexOf(targetId);
  if (targetIndex < 0) {
    return [];
  }

  const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1;
  if (anchorIndex < 0) {
    return [targetId];
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return orderedIds.slice(start, end + 1);
}

export function buildNextFolderPath(parentPath: string, folderName: string) {
  return pathUtils.join(parentPath === '/' ? '' : parentPath, folderName).replace(/^$/, '/');
}
