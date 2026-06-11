package types


type CommentListResponse struct {
	Items []DriveComment `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
