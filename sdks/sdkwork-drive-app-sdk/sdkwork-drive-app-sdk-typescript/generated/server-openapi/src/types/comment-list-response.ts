import type { DriveComment } from './drive-comment';

export interface CommentListResponse {
  items: DriveComment[];
  nextPageToken?: string;
}


