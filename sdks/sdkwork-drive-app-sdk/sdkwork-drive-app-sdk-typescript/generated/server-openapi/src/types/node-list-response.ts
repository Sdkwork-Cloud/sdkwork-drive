import type { DriveNode } from './drive-node';

export interface NodeListResponse {
  items: DriveNode[];
  nextPageToken?: string;
  /** True when ACL pagination scan budget was exhausted before the requested page could be filled. */
  incompletePage?: boolean;
}
