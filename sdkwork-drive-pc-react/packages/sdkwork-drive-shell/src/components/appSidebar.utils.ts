import { FolderKanban, History, Settings2, Star, Trash2 } from 'lucide-react';
import { ROUTE_PATHS } from '../application/router/routePaths.ts';

export const APP_SIDEBAR_NAV_ITEMS = [
  {
    to: ROUTE_PATHS.DRIVE,
    icon: FolderKanban,
    labelKey: 'sidebar.drive',
  },
  {
    to: ROUTE_PATHS.DRIVE_STARRED,
    icon: Star,
    labelKey: 'sidebar.starred',
  },
  {
    to: ROUTE_PATHS.DRIVE_RECENT,
    icon: History,
    labelKey: 'sidebar.recent',
  },
  {
    to: ROUTE_PATHS.DRIVE_TRASH,
    icon: Trash2,
    labelKey: 'sidebar.trash',
  },
  {
    to: ROUTE_PATHS.SETTINGS,
    icon: Settings2,
    labelKey: 'sidebar.settings',
  },
] as const;

export function resolveSidebarToggleLabelKey(collapsed: boolean) {
  return collapsed ? 'sidebar.expand' : 'sidebar.collapse';
}
