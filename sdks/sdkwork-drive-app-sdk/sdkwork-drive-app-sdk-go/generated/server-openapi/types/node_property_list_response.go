package types


type NodePropertyListResponse struct {
	Items []DriveNodeProperty `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
