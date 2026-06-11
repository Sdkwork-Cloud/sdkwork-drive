package types


type VersionListResponse struct {
	Items []FileVersion `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
