export function getSearchValue(search: string) {
  return new URLSearchParams(search).get('q') || '';
}

export function resolveAppHeaderSectionLabelKey(pathname: string) {
  if (pathname.startsWith('/drive/starred')) {
    return 'drive.sidebar.starred';
  }

  if (pathname.startsWith('/drive/recent')) {
    return 'drive.sidebar.recent';
  }

  if (pathname.startsWith('/drive/trash')) {
    return 'drive.sidebar.trash';
  }

  if (pathname.startsWith('/settings')) {
    return 'sidebar.settings';
  }

  if (pathname.startsWith('/drive')) {
    return 'drive.sidebar.myDrive';
  }

  return null;
}

export function buildNextSearch(search: string, nextQuery: string) {
  const params = new URLSearchParams(search);
  if (nextQuery.trim()) {
    params.set('q', nextQuery.trim());
  } else {
    params.delete('q');
  }

  const nextValue = params.toString();
  return nextValue ? `?${nextValue}` : '';
}

export function shouldFocusDriveSearch(options: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}) {
  return Boolean(
    (options.ctrlKey || options.metaKey) &&
      !options.altKey &&
      options.key.toLowerCase() === 'k',
  );
}

export function isEditableTarget(target: EventTarget | null) {
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
