import type { DriveItem, DriveStats } from '../entities/drive.entity.ts';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';
import { getSelectedItemsTotalBytes } from '../store/driveStore.helpers.ts';
import {
  buildPreviewFacts,
  type BuildPreviewFactsOptions,
  type PreviewFact,
} from './viewState.ts';

export type DriveViewKind = 'drive' | 'starred' | 'recent' | 'trash';
export type DriveDetailsActionId =
  | 'clearSearch'
  | 'clearFilter'
  | 'emptyTrash'
  | 'createFolder'
  | 'upload';
export type DriveDetailsRecommendationTone = 'default' | 'primary' | 'warning';
export type DriveDetailsFocusReason = 'shared' | 'starred' | 'recent' | 'selected' | 'trash';

export interface DriveDetailsRecommendation {
  tone: DriveDetailsRecommendationTone;
  titleKey: string;
  descriptionKey: string;
  actionId: DriveDetailsActionId | null;
}

export interface DriveDetailsFocusItem {
  id: string;
  name: string;
  path: string;
  type: DriveItem['type'];
  reason: DriveDetailsFocusReason;
}

export interface DriveWorkspaceSummaryOptions {
  currentPath: string;
  items: DriveItem[];
  selectedItems: DriveItem[];
  searchQuery: string;
  filterType: FileTypeFilter;
  stats: DriveStats | null;
}

export interface DriveWorkspaceSummary {
  viewKind: DriveViewKind;
  resultCount: number;
  fileCount: number;
  folderCount: number;
  starredCount: number;
  selectedCount: number;
  selectedTotalBytes: number;
  hasActiveSearch: boolean;
  hasActiveFilter: boolean;
  usagePercent: number;
  usedBytes: number;
  totalBytes: number;
}

export type DriveDetailsPanelModel =
  | {
      mode: 'overview';
      viewKind: DriveViewKind;
      resultCount: number;
      fileCount: number;
      folderCount: number;
      hasActiveSearch: boolean;
      hasActiveFilter: boolean;
      usagePercent: number;
      usedBytes: number;
      totalBytes: number;
      selectedCount: number;
      selectedTotalBytes: number;
      canCreateContent: boolean;
      recommendation: DriveDetailsRecommendation;
      focusItems: DriveDetailsFocusItem[];
    }
  | {
      mode: 'selection';
      viewKind: DriveViewKind;
      selectedCount: number;
      folderCount: number;
      fileCount: number;
      selectedTotalBytes: number;
      hasActiveSearch: boolean;
      hasActiveFilter: boolean;
      canCreateContent: boolean;
      recommendation: DriveDetailsRecommendation;
      focusItems: DriveDetailsFocusItem[];
    }
  | {
      mode: 'item';
      viewKind: DriveViewKind;
      item: DriveItem;
      facts: PreviewFact[];
    };

export interface DriveDetailsPanelModelOptions
  extends DriveWorkspaceSummaryOptions,
    BuildPreviewFactsOptions {}

export function resolveDriveViewKind(currentPath: string): DriveViewKind {
  switch (currentPath) {
    case 'virtual://starred':
      return 'starred';
    case 'virtual://recent':
      return 'recent';
    case 'virtual://trash':
      return 'trash';
    default:
      return 'drive';
  }
}

export function buildDriveWorkspaceSummary(
  options: DriveWorkspaceSummaryOptions,
): DriveWorkspaceSummary {
  const fileCount = options.items.filter((item) => item.type === 'file').length;
  const folderCount = options.items.filter((item) => item.type === 'folder').length;
  const totalBytes = Math.max(0, options.stats?.totalBytes ?? 0);
  const usedBytes = Math.max(0, options.stats?.usedBytes ?? 0);
  const usagePercent =
    totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0;

  return {
    viewKind: resolveDriveViewKind(options.currentPath),
    resultCount: options.items.length,
    fileCount,
    folderCount,
    starredCount: options.items.filter((item) => Boolean(item.isStarred)).length,
    selectedCount: options.selectedItems.length,
    selectedTotalBytes: getSelectedItemsTotalBytes(options.selectedItems),
    hasActiveSearch: options.searchQuery.trim().length > 0,
    hasActiveFilter: options.filterType !== 'all',
    usagePercent,
    usedBytes,
    totalBytes,
  };
}

function createFocusItem(item: DriveItem, reason: DriveDetailsFocusReason): DriveDetailsFocusItem {
  return {
    id: item.id,
    name: item.name,
    path: item.path || '/',
    type: item.type,
    reason,
  };
}

function sortItemsByRecentActivity(items: DriveItem[], viewKind: DriveViewKind) {
  const getActivityTimestamp = (item: DriveItem) => {
    if (viewKind === 'trash') {
      return item.trashedAt ?? item.updatedAt;
    }

    return item.accessedAt ?? item.updatedAt;
  };

  return [...items].sort((left, right) => getActivityTimestamp(right) - getActivityTimestamp(left));
}

function buildOverviewFocusItems(items: DriveItem[], viewKind: DriveViewKind) {
  if (items.length === 0) {
    return [];
  }

  if (viewKind === 'recent') {
    return sortItemsByRecentActivity(items, viewKind)
      .slice(0, 3)
      .map((item) => createFocusItem(item, 'recent'));
  }

  if (viewKind === 'trash') {
    return sortItemsByRecentActivity(items, viewKind)
      .slice(0, 3)
      .map((item) => createFocusItem(item, 'trash'));
  }

  if (viewKind === 'starred') {
    return items
      .filter((item) => item.isStarred)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 3)
      .map((item) => createFocusItem(item, 'starred'));
  }

  return [...items]
    .sort((left, right) => {
      const score = (item: DriveItem) => {
        if (item.isShared) {
          return 3;
        }

        if (item.isStarred) {
          return 2;
        }

        return 1;
      };

      return score(right) - score(left) || right.updatedAt - left.updatedAt;
    })
    .slice(0, 3)
    .map((item) =>
      createFocusItem(item, item.isShared ? 'shared' : item.isStarred ? 'starred' : 'recent'),
    );
}

function buildOverviewRecommendation(summary: DriveWorkspaceSummary): DriveDetailsRecommendation {
  if (summary.hasActiveSearch) {
    return {
      tone: 'primary',
      titleKey: 'drive.details.recommendations.search.title',
      descriptionKey: 'drive.details.recommendations.search.description',
      actionId: 'clearSearch',
    };
  }

  if (summary.hasActiveFilter) {
    return {
      tone: 'primary',
      titleKey: 'drive.details.recommendations.filter.title',
      descriptionKey: 'drive.details.recommendations.filter.description',
      actionId: 'clearFilter',
    };
  }

  if (summary.viewKind === 'trash') {
    return {
      tone: 'warning',
      titleKey: 'drive.details.recommendations.trash.title',
      descriptionKey: 'drive.details.recommendations.trash.description',
      actionId: 'emptyTrash',
    };
  }

  if (summary.viewKind === 'recent') {
    return {
      tone: 'primary',
      titleKey: 'drive.details.recommendations.recent.title',
      descriptionKey: 'drive.details.recommendations.recent.description',
      actionId: null,
    };
  }

  if (summary.viewKind === 'starred') {
    return {
      tone: 'primary',
      titleKey: 'drive.details.recommendations.starred.title',
      descriptionKey: 'drive.details.recommendations.starred.description',
      actionId: null,
    };
  }

  return {
    tone: 'default',
    titleKey: 'drive.details.recommendations.organize.title',
    descriptionKey: 'drive.details.recommendations.organize.description',
    actionId: 'createFolder',
  };
}

function buildSelectionRecommendation(viewKind: DriveViewKind): DriveDetailsRecommendation {
  if (viewKind === 'trash') {
    return {
      tone: 'warning',
      titleKey: 'drive.details.recommendations.selectionTrash.title',
      descriptionKey: 'drive.details.recommendations.selectionTrash.description',
      actionId: null,
    };
  }

  return {
    tone: 'primary',
    titleKey: 'drive.details.recommendations.selection.title',
    descriptionKey: 'drive.details.recommendations.selection.description',
    actionId: null,
  };
}

export function buildDriveDetailsPanelModel(
  options: DriveDetailsPanelModelOptions,
): DriveDetailsPanelModel {
  const summary = buildDriveWorkspaceSummary(options);
  const canCreateContent = summary.viewKind === 'drive';

  if (options.selectedItems.length === 1) {
    return {
      mode: 'item',
      viewKind: summary.viewKind,
      item: options.selectedItems[0],
      facts: buildPreviewFacts(options.selectedItems[0], options),
    };
  }

  if (options.selectedItems.length > 1) {
    return {
      mode: 'selection',
      viewKind: summary.viewKind,
      selectedCount: summary.selectedCount,
      folderCount: options.selectedItems.filter((item) => item.type === 'folder').length,
      fileCount: options.selectedItems.filter((item) => item.type === 'file').length,
      selectedTotalBytes: summary.selectedTotalBytes,
      canCreateContent,
      hasActiveSearch: summary.hasActiveSearch,
      hasActiveFilter: summary.hasActiveFilter,
      recommendation: buildSelectionRecommendation(summary.viewKind),
      focusItems: options.selectedItems
        .slice(0, 3)
        .map((item) => createFocusItem(item, 'selected')),
    };
  }

  return {
    mode: 'overview',
    viewKind: summary.viewKind,
    resultCount: summary.resultCount,
    fileCount: summary.fileCount,
    folderCount: summary.folderCount,
    hasActiveSearch: summary.hasActiveSearch,
    hasActiveFilter: summary.hasActiveFilter,
    usagePercent: summary.usagePercent,
    usedBytes: summary.usedBytes,
    totalBytes: summary.totalBytes,
    selectedCount: summary.selectedCount,
    selectedTotalBytes: summary.selectedTotalBytes,
    canCreateContent,
    recommendation: buildOverviewRecommendation(summary),
    focusItems: buildOverviewFocusItems(options.items, summary.viewKind),
  };
}
