import { formatBytes, pathUtils } from '@sdkwork/drive-commons';
import type { DriveItem } from '../entities/drive.entity.ts';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';

export type DriveEmptyStateMode = 'default' | 'filter' | 'search' | 'trash';

export interface ResolveDriveEmptyStateModeOptions {
  searchQuery: string;
  filterType: FileTypeFilter;
  isTrashView: boolean;
}

export interface PreviewFact {
  id: 'created' | 'location' | 'shared' | 'size' | 'starred' | 'type' | 'updated';
  value: string;
}

export interface BuildPreviewFactsOptions {
  formatBytes?: (value: number) => string;
  formatDateTime?: (value: number) => string;
}

function inferDriveItemKind(item: DriveItem) {
  if (item.type === 'folder') {
    return 'Folder';
  }

  const extension = pathUtils.extname(item.name).replace(/^\./, '').trim();
  if (extension) {
    return extension.toUpperCase();
  }

  const mimeTail = (item.mimeType || '').split('/').pop()?.trim();
  if (mimeTail) {
    return mimeTail.toUpperCase();
  }

  return 'File';
}

export function buildPreviewHighlightFacts(facts: PreviewFact[]) {
  const priority: PreviewFact['id'][] = ['type', 'size', 'updated', 'location'];

  return priority.flatMap((id) => {
    const fact = facts.find((candidate) => candidate.id === id);
    return fact ? [{ id: fact.id, value: fact.value }] : [];
  });
}

export function resolvePreviewRevealPath(item: DriveItem) {
  const itemPath = item.path || '/';

  if (item.type === 'folder') {
    return itemPath;
  }

  return pathUtils.dirname(itemPath) || '/';
}

export function buildPreviewStatusFlagIds(item: DriveItem) {
  const flags: Array<'starred' | 'shared'> = [];

  if (item.isStarred) {
    flags.push('starred');
  }

  if (item.isShared) {
    flags.push('shared');
  }

  return flags;
}

export function resolveDriveEmptyStateMode(
  options: ResolveDriveEmptyStateModeOptions,
): DriveEmptyStateMode {
  if (options.searchQuery.trim()) {
    return 'search';
  }

  if (options.filterType !== 'all') {
    return 'filter';
  }

  if (options.isTrashView) {
    return 'trash';
  }

  return 'default';
}

export function buildPreviewFacts(
  item: DriveItem,
  options: BuildPreviewFactsOptions = {},
): PreviewFact[] {
  const formatBytesValue = options.formatBytes ?? formatBytes;
  const formatDateTime =
    options.formatDateTime ??
    ((value: number) =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)));

  return [
    {
      id: 'type',
      value: inferDriveItemKind(item),
    },
    {
      id: 'size',
      value: item.type === 'folder' ? '--' : formatBytesValue(item.size),
    },
    {
      id: 'location',
      value: item.path || '/',
    },
    {
      id: 'updated',
      value: formatDateTime(item.updatedAt),
    },
    {
      id: 'created',
      value: formatDateTime(item.createdAt),
    },
    {
      id: 'starred',
      value: String(Boolean(item.isStarred)),
    },
    {
      id: 'shared',
      value: String(Boolean(item.isShared)),
    },
  ];
}
