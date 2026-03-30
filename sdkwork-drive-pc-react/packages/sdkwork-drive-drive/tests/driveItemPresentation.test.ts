import { describe, expect, it } from 'vitest';
import type { DriveItem } from '../src/entities/drive.entity.ts';
import {
  buildDriveItemBadges,
  resolveDriveItemLocationLabel,
  resolveDriveItemKindLabel,
  resolveDriveItemThumbnailSrc,
} from '../src/utils/driveItemPresentation.ts';

const IMAGE_ITEM: DriveItem = {
  id: 'image-1',
  parentId: 'folder-1',
  name: 'Hero Banner.png',
  type: 'file',
  path: '/Design/Hero Banner.png',
  size: 4096,
  mimeType: 'image/png',
  thumbnailUrl: 'https://example.com/thumb.png',
  previewUrl: 'https://example.com/preview.png',
  updatedAt: 1700000000000,
  createdAt: 1690000000000,
  isShared: true,
  isStarred: true,
};

describe('drive item presentation helpers', () => {
  it('prefers thumbnail sources for previewable image assets', () => {
    expect(resolveDriveItemThumbnailSrc(IMAGE_ITEM)).toBe('https://example.com/thumb.png');

    expect(
      resolveDriveItemThumbnailSrc({
        ...IMAGE_ITEM,
        thumbnailUrl: '',
      }),
    ).toBe('https://example.com/preview.png');
  });

  it('does not resolve thumbnails for non-image content or folders', () => {
    expect(
      resolveDriveItemThumbnailSrc({
        ...IMAGE_ITEM,
        name: 'Quarterly Report.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBeNull();

    expect(
      resolveDriveItemThumbnailSrc({
        ...IMAGE_ITEM,
        type: 'folder',
      }),
    ).toBeNull();
  });

  it('resolves item locations relative to the drive root', () => {
    expect(resolveDriveItemLocationLabel(IMAGE_ITEM, 'My Drive')).toBe('/Design');

    expect(
      resolveDriveItemLocationLabel(
        {
          ...IMAGE_ITEM,
          id: 'root-file',
          path: '/Notes.md',
        },
        'My Drive',
      ),
    ).toBe('My Drive');

    expect(
      resolveDriveItemLocationLabel(
        {
          ...IMAGE_ITEM,
          id: 'folder',
          type: 'folder',
          path: '/Design',
        },
        'My Drive',
      ),
    ).toBe('My Drive');
  });

  it('builds compact badges that add context in virtual views', () => {
    expect(
      buildDriveItemBadges({
        item: IMAGE_ITEM,
        isVirtualView: true,
        myDriveLabel: 'My Drive',
        sharedLabel: 'Shared',
        starredLabel: 'Starred',
      }),
    ).toEqual([
      { key: 'shared', label: 'Shared' },
      { key: 'starred', label: 'Starred' },
      { key: 'location', label: '/Design' },
    ]);

    expect(
      buildDriveItemBadges({
        item: {
          ...IMAGE_ITEM,
          isShared: false,
          isStarred: false,
        },
        isVirtualView: false,
        myDriveLabel: 'My Drive',
        sharedLabel: 'Shared',
        starredLabel: 'Starred',
      }),
    ).toEqual([]);
  });

  it('resolves a professional kind label for files and folders', () => {
    expect((resolveDriveItemKindLabel as any)?.(IMAGE_ITEM)).toBe('PNG');
    expect(
      (resolveDriveItemKindLabel as any)?.({
        ...IMAGE_ITEM,
        id: 'folder-1',
        type: 'folder',
      }),
    ).toBe('Folder');
    expect(
      (resolveDriveItemKindLabel as any)?.({
        ...IMAGE_ITEM,
        id: 'mime-fallback',
        name: 'README',
        mimeType: 'text/markdown',
      }),
    ).toBe('MARKDOWN');
  });
});
