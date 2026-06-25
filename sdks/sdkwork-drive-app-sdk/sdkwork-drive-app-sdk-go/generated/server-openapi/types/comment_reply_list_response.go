package types


type CommentReplyListResponse struct {
	Items []DriveCommentReply `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
