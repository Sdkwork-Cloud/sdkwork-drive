package types


type UpdateSpaceRequest struct {
	TenantId string `json:"tenantId"`
	DisplayName string `json:"displayName"`
	OperatorId string `json:"operatorId"`
}
