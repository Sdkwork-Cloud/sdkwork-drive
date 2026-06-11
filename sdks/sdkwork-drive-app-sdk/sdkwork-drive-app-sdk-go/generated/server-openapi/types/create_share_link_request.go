package types


type CreateShareLinkRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	Token string `json:"token"`
	Role string `json:"role"`
	ExpiresAtEpochMs int `json:"expiresAtEpochMs"`
	DownloadLimit int `json:"downloadLimit"`
	OperatorId string `json:"operatorId"`
}
