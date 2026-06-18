package types


type AssetCollectionPage struct {
	Items []AssetCollection `json:"items"`
	NextCursor string `json:"nextCursor"`
}
