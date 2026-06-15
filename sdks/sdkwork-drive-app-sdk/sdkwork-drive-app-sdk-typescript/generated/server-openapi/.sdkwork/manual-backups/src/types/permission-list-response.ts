import type { DrivePermission } from './drive-permission';

export interface PermissionListResponse {
  items: DrivePermission[];
  nextPageToken?: string;
}


