package types


type LabelListResponse struct {
	Items []DriveLabel `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
