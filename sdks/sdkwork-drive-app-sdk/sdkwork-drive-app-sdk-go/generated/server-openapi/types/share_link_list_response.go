package types


type ShareLinkListResponse struct {
	Items []DriveShareLink `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
