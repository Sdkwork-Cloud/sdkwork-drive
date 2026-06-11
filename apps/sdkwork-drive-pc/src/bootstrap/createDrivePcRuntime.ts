import {
  createDriveAdminStorageSdkClient,
  createDriveAppSdkClient,
  createDriveSessionTokenManager,
  createDriveFileService,
  createHostAdapter,
  createRuntimeConfig,
  createSessionStore,
  type SessionStorageLike,
  type DriveRuntime,
} from 'sdkwork-drive-pc-core';
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
    sdkClients: [
      appSdkClient,
      adminStorageSdkClient,
    ],
    session,
    tokenManager,
  });

  return {
    config,
    auth: {
      iamRuntime,
    },
    sdk: {
      app: appSdkClient,
      adminStorage: adminStorageSdkClient,
    },
    session,
    host: createHostAdapter(),
    services: {
      fileService: createDriveFileService({
        appSdkClient,
        adminStorageSdkClient,
        getSession: session.getSnapshot,
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
