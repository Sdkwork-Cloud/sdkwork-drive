package types


type PresignUploadPartRequest struct {
	TenantId string `json:"tenantId"`
	UploadId string `json:"uploadId"`
	RequestedTtlSeconds int `json:"requestedTtlSeconds"`
}
