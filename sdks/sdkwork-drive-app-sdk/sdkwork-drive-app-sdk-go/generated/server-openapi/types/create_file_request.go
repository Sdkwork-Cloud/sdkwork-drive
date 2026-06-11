package types


type CreateFileRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	ParentNodeId string `json:"parentNodeId"`
	NodeName string `json:"nodeName"`
	OperatorId string `json:"operatorId"`
	UploadSessionId string `json:"uploadSessionId"`
	IdempotencyKey string `json:"idempotencyKey"`
	ExpiresAtEpochMs int `json:"expiresAtEpochMs"`
	Bucket string `json:"bucket"`
	ObjectKey string `json:"objectKey"`
}
