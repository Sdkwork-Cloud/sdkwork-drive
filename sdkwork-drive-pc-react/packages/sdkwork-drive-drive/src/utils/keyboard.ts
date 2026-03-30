export type DriveKeyboardAction =
  | 'clearSelection'
  | 'closeContextMenu'
  | 'closePreview'
  | 'deleteSelection'
  | 'openSelection'
  | 'previewSelection'
  | 'renameSelection'
  | 'selectAll';

export interface ResolveDriveKeyboardActionOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  selectionCount: number;
  isTypingTarget?: boolean;
  isTrashView?: boolean;
  hasPreviewOpen?: boolean;
  hasContextMenuOpen?: boolean;
  hasNameDialogOpen?: boolean;
}

export function resolveDriveKeyboardAction(
  options: ResolveDriveKeyboardActionOptions,
): DriveKeyboardAction | null {
  const key = options.key;

  if (key === 'Escape') {
    if (options.hasPreviewOpen) {
      return 'closePreview';
    }
    if (options.hasContextMenuOpen) {
      return 'closeContextMenu';
    }
    if (options.selectionCount > 0) {
      return 'clearSelection';
    }
    return null;
  }

  if (options.hasNameDialogOpen || options.isTypingTarget) {
    return null;
  }

  const hasPrimaryModifier = Boolean(options.ctrlKey || options.metaKey);
  if (hasPrimaryModifier && !options.altKey && key.toLowerCase() === 'a') {
    return 'selectAll';
  }

  if (options.selectionCount !== 1) {
    if ((key === 'Delete' || key === 'Backspace') && options.selectionCount > 0 && !options.isTrashView) {
      return 'deleteSelection';
    }

    return null;
  }

  if (key === 'Enter') {
    return 'openSelection';
  }

  if (key === ' ' || key === 'Spacebar') {
    return 'previewSelection';
  }

  if (key === 'F2') {
    return 'renameSelection';
  }

  if ((key === 'Delete' || key === 'Backspace') && !options.isTrashView) {
    return 'deleteSelection';
  }

  return null;
}

export function isTypingElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}
