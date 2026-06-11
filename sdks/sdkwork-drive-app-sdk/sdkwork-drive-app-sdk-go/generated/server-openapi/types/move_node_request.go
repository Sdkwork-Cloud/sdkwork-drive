package types


type MoveNodeRequest struct {
	TenantId string `json:"tenantId"`
	TargetParentNodeId string `json:"targetParentNodeId"`
	OperatorId string `json:"operatorId"`
}
