import type { DriveSection } from '../pages/DrivePage';

const BUILTIN_SECTION_PATHS: Record<string, string> = {
  'my-storage': '/my-storage',
  recent: '/recent',
  starred: '/starred',
  shared: '/shared',
  computers: '/computers',
  transfer: '/transfer',
  trash: '/trash',
  apps: '/apps',
  'admin-storage-providers': '/admin/storage-providers',
  'admin-storage-bindings': '/admin/storage-bindings',
};

const DEFAULT_SECTION: DriveSection = 'my-storage';
const DEFAULT_PATH = BUILTIN_SECTION_PATHS[DEFAULT_SECTION];

export function driveSectionToPath(section: DriveSection): string {
  const builtinPath = BUILTIN_SECTION_PATHS[section];
  if (builtinPath) {
    return builtinPath;
  }
  return `/spaces/${encodeURIComponent(section)}`;
}

export function drivePathToSection(pathname: string): DriveSection {
  const normalized = normalizePathname(pathname);
  for (const [section, path] of Object.entries(BUILTIN_SECTION_PATHS)) {
    if (normalized === path) {
      return section;
    }
  }

  const spaceMatch = normalized.match(/^\/spaces\/([^/]+)$/);
  if (spaceMatch?.[1]) {
    return decodeURIComponent(spaceMatch[1]);
  }

  return DEFAULT_SECTION;
}

export function resolveDriveSectionPath(pathname: string): string {
  const section = drivePathToSection(pathname);
  return driveSectionToPath(section);
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return DEFAULT_PATH;
  }
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || DEFAULT_PATH;
}
