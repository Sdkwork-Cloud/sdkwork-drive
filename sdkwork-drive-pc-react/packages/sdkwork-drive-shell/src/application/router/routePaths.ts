import { driveRoutePaths } from './routeMapping.ts';

export const ROUTE_PATHS = {
  ROOT: '/',
  AUTH: '/auth',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  OAUTH_CALLBACK_PREFIX: '/login/oauth/callback',
  DRIVE: driveRoutePaths.root,
  DRIVE_STARRED: driveRoutePaths.starred,
  DRIVE_RECENT: driveRoutePaths.recent,
  DRIVE_TRASH: driveRoutePaths.trash,
  SETTINGS: '/settings',
} as const;
