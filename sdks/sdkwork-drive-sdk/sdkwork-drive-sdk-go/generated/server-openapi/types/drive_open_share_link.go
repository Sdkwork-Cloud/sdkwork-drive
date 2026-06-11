package types


type DriveOpenShareLink struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	Role string `json:"role"`
	ExpiresAtEpochMs int `json:"expiresAtEpochMs"`
	DownloadLimit int `json:"downloadLimit"`
	DownloadCount int `json:"downloadCount"`
	Node OpenNode `json:"node"`
}
