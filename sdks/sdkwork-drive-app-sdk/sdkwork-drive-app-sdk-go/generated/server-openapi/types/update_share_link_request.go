package types


type UpdateShareLinkRequest struct {
	TenantId string `json:"tenantId"`
	Role string `json:"role"`
	ExpiresAtEpochMs int `json:"expiresAtEpochMs"`
	DownloadLimit int `json:"downloadLimit"`
	OperatorId string `json:"operatorId"`
}
