import { pathUtils } from '@sdkwork/drive-commons';
import type { DriveItem } from '../entities/drive.entity.ts';

export interface DriveItemBadge {
  key: 'shared' | 'starred' | 'location';
  label: string;
}

function isImageItem(item: DriveItem) {
  if (item.type !== 'file') {
    return false;
  }

  const mimeType = (item.mimeType || '').toLowerCase();
  const fileName = item.name.toLowerCase();

  return mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico|tiff)$/.test(fileName);
}

export function resolveDriveItemKindLabel(item: DriveItem) {
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

export function resolveDriveItemThumbnailSrc(item: DriveItem) {
  if (!isImageItem(item)) {
    return null;
  }

  return item.thumbnailUrl || item.previewUrl || null;
}

export function resolveDriveItemLocationLabel(item: DriveItem, myDriveLabel: string) {
  const itemPath = item.path || '/';
  const locationPath =
    item.type === 'folder' ? pathUtils.dirname(itemPath) || '/' : pathUtils.dirname(itemPath) || '/';

  return locationPath === '/' ? myDriveLabel : locationPath;
}

export function buildDriveItemBadges(options: {
  item: DriveItem;
  isVirtualView: boolean;
  myDriveLabel: string;
  sharedLabel: string;
  starredLabel: string;
}): DriveItemBadge[] {
  const badges: DriveItemBadge[] = [];

  if (options.item.isShared) {
    badges.push({
      key: 'shared',
      label: options.sharedLabel,
    });
  }

  if (options.item.isStarred) {
    badges.push({
      key: 'starred',
      label: options.starredLabel,
    });
  }

  if (options.isVirtualView) {
    badges.push({
      key: 'location',
      label: resolveDriveItemLocationLabel(options.item, options.myDriveLabel),
    });
  }

  return badges;
}
