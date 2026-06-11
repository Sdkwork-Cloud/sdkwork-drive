package types


type EffectivePermissionListResponse struct {
	Items []EffectivePermission `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
