package types


type UpdatePermissionRequest struct {
	TenantId string `json:"tenantId"`
	Role string `json:"role"`
	OperatorId string `json:"operatorId"`
}
