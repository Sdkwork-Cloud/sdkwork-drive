package types


type CreateDownloadUrlRequest struct {
	TenantId string `json:"tenantId"`
	NodeId string `json:"nodeId"`
	RequestedTtlSeconds int `json:"requestedTtlSeconds"`
}
