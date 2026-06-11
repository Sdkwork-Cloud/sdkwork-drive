package types


type EmptyTrashRequest struct {
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	OperatorId string `json:"operatorId"`
}
