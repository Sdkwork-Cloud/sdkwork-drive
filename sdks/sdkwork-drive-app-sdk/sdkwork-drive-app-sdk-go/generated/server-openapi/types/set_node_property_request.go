package types


type SetNodePropertyRequest struct {
	TenantId string `json:"tenantId"`
	Value string `json:"value"`
	Visibility string `json:"visibility"`
	OperatorId string `json:"operatorId"`
}
