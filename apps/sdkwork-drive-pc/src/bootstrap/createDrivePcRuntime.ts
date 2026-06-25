import {
  createDriveAppSdkClient,
  createDriveSessionTokenManager,
  createDriveFileService,
  createHostAdapter,
  createOsSecureSessionStorage,
  createRuntimeConfig,
  createSessionStore,
  type SessionStorageLike,
} from 'sdkwork-drive-pc-core';
import {
  createDriveAdminStorageSdkClient,
  createDriveBackendSdkClient,
  type DriveRuntime,
} from 'sdkwork-drive-pc-admin-core';
import { createDriveIamRuntime } from './driveIamRuntime';
import { primePcReactRuntimeSessionCache } from './sdkworkCorePcReactShim';

export async function createDrivePcRuntime(): Promise<DriveRuntime> {
  const config = createRuntimeConfig(import.meta.env);
  const sessionStorage = await resolveSessionStorage(config.auth.tokenStorage);
  const session = createSessionStore(sessionStorage);
  const tokenManager = createDriveSessionTokenManager(session);
  const appSdkClient = createDriveAppSdkClient({
    config,
    tokenManager,
    uploaderStateStorage: sessionStorage,
  });
  const adminStorageSdkClient = createDriveAdminStorageSdkClient({
    config,
    tokenManager,
  });
  const backendSdkClient = createDriveBackendSdkClient({
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
  backendSdkClient.setTokenManager(tokenManager);

  const host = createHostAdapter();
  primePcReactRuntimeSessionCache(session.getSnapshot());
  session.subscribe((snapshot) => {
    primePcReactRuntimeSessionCache(snapshot);
  });

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
      backend: backendSdkClient,
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

async function resolveSessionStorage(
  tokenStorage: DriveRuntime['config']['auth']['tokenStorage'],
): Promise<SessionStorageLike | undefined> {
  if (typeof window === 'undefined') {
    return undefined;
  }
  if (tokenStorage === 'browser-local') {
    return window.localStorage;
  }
  if (tokenStorage === 'os-secure-storage') {
    return createOsSecureSessionStorage();
  }
  if (tokenStorage === 'browser-session') {
    return window.sessionStorage;
  }
  return undefined;
}
