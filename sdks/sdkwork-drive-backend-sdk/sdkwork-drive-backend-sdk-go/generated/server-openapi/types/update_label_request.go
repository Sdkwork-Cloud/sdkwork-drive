package types


type UpdateLabelRequest struct {
	TenantId string `json:"tenantId"`
	DisplayName string `json:"displayName"`
	Color string `json:"color"`
	Description string `json:"description"`
	OperatorId string `json:"operatorId"`
}
