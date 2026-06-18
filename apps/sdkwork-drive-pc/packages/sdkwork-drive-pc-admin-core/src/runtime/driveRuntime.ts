import type { DriveCoreRuntime } from 'sdkwork-drive-pc-core';
import type { DriveAdminStorageSdkClient } from '../sdk/driveAdminStorageSdkClient';

export interface DriveRuntime extends DriveCoreRuntime {
  admin: {
    adminStorage: DriveAdminStorageSdkClient;
  };
}
