import type { Change } from './change';

export interface ChangeListResponse {
  items: Change[];
  nextCursor?: string;
  nextPageToken?: string;
}
