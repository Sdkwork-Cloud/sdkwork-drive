import type { DriveLabel } from './drive-label';

export interface LabelListResponse {
  items: DriveLabel[];
  nextPageToken?: string | null;
}
