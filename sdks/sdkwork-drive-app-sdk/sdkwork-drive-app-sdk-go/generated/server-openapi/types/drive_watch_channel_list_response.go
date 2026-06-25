package types


type DriveWatchChannelListResponse struct {
	Items []DriveWatchChannel `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
