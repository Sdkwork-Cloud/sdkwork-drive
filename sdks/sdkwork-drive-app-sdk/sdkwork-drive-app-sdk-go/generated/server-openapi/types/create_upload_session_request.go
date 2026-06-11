package types


type CreateUploadSessionRequest struct {
	SessionId string `json:"sessionId"`
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	NodeId string `json:"nodeId"`
	Bucket string `json:"bucket"`
	ObjectKey string `json:"objectKey"`
	IdempotencyKey string `json:"idempotencyKey"`
	OperatorId string `json:"operatorId"`
	ExpiresAtEpochMs int `json:"expiresAtEpochMs"`
}
