import type { SessionSnapshot } from 'sdkwork-drive-pc-core';

export const DRIVE_STORAGE_ADMIN_PERMISSION = 'drive.storage.admin';

export function canAccessDriveAdminStorage(session: SessionSnapshot): boolean {
  const scopes = session.context?.permissionScope ?? [];
  return scopes.some((scope) => {
    if (scope === DRIVE_STORAGE_ADMIN_PERMISSION) {
      return true;
    }
    if (scope === 'drive.*') {
      return true;
    }
    return scope.startsWith('drive.') && scope.endsWith('.admin');
  });
}
