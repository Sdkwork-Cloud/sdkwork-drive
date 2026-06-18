import {
  createDriveAppSdkClient,
  createDriveSessionTokenManager,
  createDriveFileService,
  createHostAdapter,
  createRuntimeConfig,
  createSessionStore,
  type SessionStorageLike,
} from 'sdkwork-drive-pc-core';
import {
  createDriveAdminStorageSdkClient,
  type DriveRuntime,
} from 'sdkwork-drive-pc-admin-core';
import { createDriveIamRuntime } from './driveIamRuntime';

export function createDrivePcRuntime(): DriveRuntime {
  const config = createRuntimeConfig(import.meta.env);
  const session = createSessionStore(resolveSessionStorage(config.auth.tokenStorage));
  const tokenManager = createDriveSessionTokenManager(session);
  const appSdkClient = createDriveAppSdkClient({
    config,
    tokenManager,
  });
  const adminStorageSdkClient = createDriveAdminStorageSdkClient({
    config,
    tokenManager,
  });
  const iamRuntime = createDriveIamRuntime({
    config,
    sdkClients: [appSdkClient],
    session,
    tokenManager,
  });
  adminStorageSdkClient.setTokenManager(tokenManager);

  const host = createHostAdapter();

  return {
    config,
    auth: {
      iamRuntime,
    },
    sdk: {
      app: appSdkClient,
    },
    admin: {
      adminStorage: adminStorageSdkClient,
    },
    session,
    host,
    services: {
      fileService: createDriveFileService({
        appSdkClient,
        getSession: session.getSnapshot,
        hostAdapter: host,
      }),
    },
  };
}

function resolveSessionStorage(
  tokenStorage: DriveRuntime['config']['auth']['tokenStorage'],
): SessionStorageLike | undefined {
  if (tokenStorage === 'browser-local') {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  }
  if (tokenStorage === 'browser-session') {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  }
  return undefined;
}
