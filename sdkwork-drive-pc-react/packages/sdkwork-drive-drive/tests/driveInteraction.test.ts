import { describe, expect, it } from 'vitest';
import {
  clampMenuPosition,
  hasFilesInDataTransfer,
  resolveDriveQuickActionTabIndex,
  resolveBatchStarStatus,
  resolveDriveQuickActions,
  shouldHandleDriveItemKeyboardEvent,
} from '../src/utils/interaction.ts';

describe('drive interaction helpers', () => {
  it('keeps context menus inside the viewport', () => {
    const position = clampMenuPosition(
      { x: 1280, y: 920 },
      { width: 220, height: 280 },
      { width: 1366, height: 768 },
    );

    expect(position).toEqual({ x: 1130, y: 472 });
  });

  it('detects file drag payloads', () => {
    expect(hasFilesInDataTransfer({ types: ['Files', 'text/plain'] })).toBe(true);
    expect(hasFilesInDataTransfer({ types: ['text/plain'] })).toBe(false);
    expect(hasFilesInDataTransfer(null)).toBe(false);
  });

  it('stars selected items when any item is not starred yet', () => {
    expect(resolveBatchStarStatus([{ isStarred: true }, { isStarred: false }])).toBe(true);
    expect(resolveBatchStarStatus([{ isStarred: true }, { isStarred: true }])).toBe(false);
  });

  it('resolves quick actions for files and folders outside trash', () => {
    expect(
      resolveDriveQuickActions({
        item: { type: 'file' },
        isTrashView: false,
      }),
    ).toEqual(['preview', 'download', 'toggleStar']);

    expect(
      resolveDriveQuickActions({
        item: { type: 'folder' },
        isTrashView: false,
      }),
    ).toEqual(['open', 'toggleStar']);
  });

  it('reduces quick actions to restore in trash views', () => {
    expect(
      resolveDriveQuickActions({
        item: { type: 'file' },
        isTrashView: true,
      }),
    ).toEqual(['restore']);

    expect(
      resolveDriveQuickActions({
        item: { type: 'folder' },
        isTrashView: true,
      }),
    ).toEqual(['restore']);
  });

  it('handles row keyboard shortcuts only when the row itself owns focus', () => {
    const rowTarget = { id: 'row' };
    const buttonTarget = { id: 'button' };

    expect(
      shouldHandleDriveItemKeyboardEvent({
        target: rowTarget,
        currentTarget: rowTarget,
      }),
    ).toBe(true);

    expect(
      shouldHandleDriveItemKeyboardEvent({
        target: buttonTarget,
        currentTarget: rowTarget,
      }),
    ).toBe(false);
  });

  it('removes hidden quick actions from the tab order', () => {
    expect(resolveDriveQuickActionTabIndex(true)).toBe(0);
    expect(resolveDriveQuickActionTabIndex(false)).toBe(-1);
  });
});
