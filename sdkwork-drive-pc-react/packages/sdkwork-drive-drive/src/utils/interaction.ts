import type { DriveItem } from '../entities/drive.entity.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type DriveQuickAction = 'open' | 'preview' | 'download' | 'toggleStar' | 'restore';

const DEFAULT_EDGE_PADDING = 16;

export function clampMenuPosition(
  position: Point,
  menuSize: Size,
  viewportSize: Size,
  edgePadding = DEFAULT_EDGE_PADDING,
): Point {
  const safeWidth = Math.max(0, menuSize.width);
  const safeHeight = Math.max(0, menuSize.height);
  const safeViewportWidth = Math.max(edgePadding * 2, viewportSize.width);
  const safeViewportHeight = Math.max(edgePadding * 2, viewportSize.height);
  const maxX = Math.max(edgePadding, safeViewportWidth - safeWidth - edgePadding);
  const maxY = Math.max(edgePadding, safeViewportHeight - safeHeight - edgePadding);

  return {
    x: Math.min(Math.max(position.x, edgePadding), maxX),
    y: Math.min(Math.max(position.y, edgePadding), maxY),
  };
}

export function hasFilesInDataTransfer(
  dataTransfer?: Pick<DataTransfer, 'types'> | null,
): boolean {
  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types || []).includes('Files');
}

export function resolveBatchStarStatus(items: Pick<DriveItem, 'isStarred'>[]): boolean {
  return items.some((item) => !item.isStarred);
}

export function resolveDriveQuickActions(options: {
  item: Pick<DriveItem, 'type'>;
  isTrashView: boolean;
}): DriveQuickAction[] {
  if (options.isTrashView) {
    return ['restore'];
  }

  if (options.item.type === 'folder') {
    return ['open', 'toggleStar'];
  }

  return ['preview', 'download', 'toggleStar'];
}

export function shouldHandleDriveItemKeyboardEvent(options: {
  target: unknown;
  currentTarget: unknown;
}) {
  return options.target === options.currentTarget;
}

export function resolveDriveQuickActionTabIndex(alwaysVisible: boolean) {
  return alwaysVisible ? 0 : -1;
}
