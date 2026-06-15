import type { DriveSpace } from './drive-space';

export interface DeleteSpaceResponse {
  deleted: boolean;
  space: DriveSpace;
  deletedNodeCount: string;
}


