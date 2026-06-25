package types


type AssetPage struct {
	Items []AssetItem `json:"items"`
	NextCursor string `json:"nextCursor"`
}
