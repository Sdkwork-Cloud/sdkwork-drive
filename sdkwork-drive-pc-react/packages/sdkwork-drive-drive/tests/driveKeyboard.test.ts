import { describe, expect, it } from 'vitest';
import { resolveDriveKeyboardAction } from '../src/utils/keyboard.ts';

describe('drive keyboard shortcuts', () => {
  it('maps desktop shortcuts to drive actions', () => {
    expect(
      resolveDriveKeyboardAction({
        key: 'a',
        ctrlKey: true,
        metaKey: false,
        selectionCount: 1,
      }),
    ).toBe('selectAll');

    expect(
      resolveDriveKeyboardAction({
        key: 'Enter',
        selectionCount: 1,
      }),
    ).toBe('openSelection');

    expect(
      resolveDriveKeyboardAction({
        key: ' ',
        selectionCount: 1,
      }),
    ).toBe('previewSelection');

    expect(
      resolveDriveKeyboardAction({
        key: 'Delete',
        selectionCount: 2,
        isTrashView: false,
      }),
    ).toBe('deleteSelection');

    expect(
      resolveDriveKeyboardAction({
        key: 'F2',
        selectionCount: 1,
      }),
    ).toBe('renameSelection');
  });

  it('ignores shortcuts while typing and uses escape contextually', () => {
    expect(
      resolveDriveKeyboardAction({
        key: 'a',
        ctrlKey: true,
        metaKey: false,
        selectionCount: 1,
        isTypingTarget: true,
      }),
    ).toBeNull();

    expect(
      resolveDriveKeyboardAction({
        key: 'Escape',
        selectionCount: 0,
        hasPreviewOpen: true,
      }),
    ).toBe('closePreview');

    expect(
      resolveDriveKeyboardAction({
        key: 'Escape',
        selectionCount: 0,
        hasContextMenuOpen: true,
      }),
    ).toBe('closeContextMenu');

    expect(
      resolveDriveKeyboardAction({
        key: 'Escape',
        selectionCount: 2,
      }),
    ).toBe('clearSelection');
  });
});
