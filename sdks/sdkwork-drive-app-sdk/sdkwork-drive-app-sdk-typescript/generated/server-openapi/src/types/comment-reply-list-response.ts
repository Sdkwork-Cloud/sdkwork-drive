import type { DriveCommentReply } from './drive-comment-reply';

export interface CommentReplyListResponse {
  items: DriveCommentReply[];
  nextPageToken?: string;
}
