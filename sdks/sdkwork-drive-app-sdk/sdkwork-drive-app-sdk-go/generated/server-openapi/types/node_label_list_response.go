package types


type NodeLabelListResponse struct {
	Items []NodeLabel `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
