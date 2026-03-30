const ROOT_DRIVE_ROUTE = '/drive';
const STARRED_ROUTE = '/drive/starred';
const RECENT_ROUTE = '/drive/recent';
const TRASH_ROUTE = '/drive/trash';

const VIRTUAL_ROUTE_MAP: Record<string, string> = {
  'virtual://starred': STARRED_ROUTE,
  'virtual://recent': RECENT_ROUTE,
  'virtual://trash': TRASH_ROUTE,
};

const ROUTE_VIRTUAL_MAP: Record<string, string> = {
  [STARRED_ROUTE]: 'virtual://starred',
  [RECENT_ROUTE]: 'virtual://recent',
  [TRASH_ROUTE]: 'virtual://trash',
};

export function resolveDrivePathFromLocation(pathname: string, search: string) {
  if (ROUTE_VIRTUAL_MAP[pathname]) {
    return ROUTE_VIRTUAL_MAP[pathname];
  }

  if (pathname !== ROOT_DRIVE_ROUTE) {
    return '/';
  }

  const params = new URLSearchParams(search);
  const requestedPath = (params.get('path') || '').trim();
  if (!requestedPath.startsWith('/')) {
    return '/';
  }

  return requestedPath || '/';
}

export function buildDriveUrl(drivePath: string) {
  if (VIRTUAL_ROUTE_MAP[drivePath]) {
    return VIRTUAL_ROUTE_MAP[drivePath];
  }

  if (!drivePath || drivePath === '/') {
    return ROOT_DRIVE_ROUTE;
  }

  return `${ROOT_DRIVE_ROUTE}?path=${encodeURIComponent(drivePath)}`;
}

export const driveRoutePaths = {
  root: ROOT_DRIVE_ROUTE,
  starred: STARRED_ROUTE,
  recent: RECENT_ROUTE,
  trash: TRASH_ROUTE,
} as const;
