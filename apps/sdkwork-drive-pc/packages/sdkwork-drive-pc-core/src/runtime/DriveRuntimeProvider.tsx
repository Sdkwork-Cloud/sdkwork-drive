import React, { createContext, useContext } from 'react';
import type { DriveRuntimeConfig } from '../config/runtimeConfig';
import type { HostAdapter } from '../host/hostAdapter';
import type { DriveAdminStorageSdkClient } from '../sdk/driveAdminStorageSdkClient';
import type { DriveAppSdkClient } from '../sdk/driveAppSdkClient';
import type { DriveFileService } from '../services/driveFileService';
import type { SessionStore } from '../session/sessionStore';

export interface DriveRuntime {
  config: DriveRuntimeConfig;
  auth?: {
    iamRuntime: unknown;
  };
  sdk: {
    app: DriveAppSdkClient;
    adminStorage: DriveAdminStorageSdkClient;
  };
  session: SessionStore;
  host: HostAdapter;
  services: {
    fileService: DriveFileService;
  };
}

const DriveRuntimeContext = createContext<DriveRuntime | null>(null);

export function DriveRuntimeProvider({
  runtime,
  children,
}: {
  runtime: DriveRuntime;
  children: React.ReactNode;
}) {
  return (
    <DriveRuntimeContext.Provider value={runtime}>{children}</DriveRuntimeContext.Provider>
  );
}

export function useDriveRuntime(): DriveRuntime {
  const runtime = useContext(DriveRuntimeContext);
  if (!runtime) {
    throw new Error('DriveRuntimeProvider is missing.');
  }
  return runtime;
}
