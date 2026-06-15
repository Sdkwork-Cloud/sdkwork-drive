import type { DriveNode } from './drive-node';

export interface NodeListResponse {
  items: DriveNode[];
  nextPageToken?: string;
}


