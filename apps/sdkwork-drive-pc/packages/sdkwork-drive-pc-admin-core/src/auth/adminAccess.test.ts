import { describe, expect, it } from 'vitest';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { canAccessDriveAdminStorage } from './adminAccess';

const baseSession: SessionSnapshot = {
  authToken: 'auth',
  accessToken: 'access',
  context: {
    tenantId: 'tenant-001',
    userId: 'user-001',
    actorId: 'user-001',
    actorKind: 'user',
  },
};

describe('canAccessDriveAdminStorage', () => {
  it('allows drive.storage.admin permission scope', () => {
    expect(canAccessDriveAdminStorage({
      ...baseSession,
      context: {
        ...baseSession.context!,
        permissionScope: ['drive.storage.admin'],
      },
    })).toBe(true);
  });

  it('denies regular drive file permissions', () => {
    expect(canAccessDriveAdminStorage({
      ...baseSession,
      context: {
        ...baseSession.context!,
        permissionScope: ['drive.nodes.read'],
      },
    })).toBe(false);
  });
});
