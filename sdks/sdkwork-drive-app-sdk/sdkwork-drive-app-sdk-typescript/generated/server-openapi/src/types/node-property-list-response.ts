import type { DriveNodeProperty } from './drive-node-property';

export interface NodePropertyListResponse {
  items: DriveNodeProperty[];
  nextPageToken?: string | null;
}
