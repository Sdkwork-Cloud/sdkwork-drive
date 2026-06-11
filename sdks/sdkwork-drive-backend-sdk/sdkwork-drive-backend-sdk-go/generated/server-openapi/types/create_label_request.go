package types


type CreateLabelRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	LabelKey string `json:"labelKey"`
	DisplayName string `json:"displayName"`
	Color string `json:"color"`
	Description string `json:"description"`
	OperatorId string `json:"operatorId"`
}
