package types


type NodeListResponse struct {
	Items []DriveNode `json:"items"`
	NextPageToken string `json:"nextPageToken"`
	IncompletePage bool `json:"incompletePage"`
}
