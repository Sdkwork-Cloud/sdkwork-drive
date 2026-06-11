package types


type ChangeListResponse struct {
	Items []Change `json:"items"`
	NextCursor int `json:"nextCursor"`
	NextPageToken string `json:"nextPageToken"`
}
