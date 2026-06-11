package types


type PermissionListResponse struct {
	Items []DrivePermission `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
