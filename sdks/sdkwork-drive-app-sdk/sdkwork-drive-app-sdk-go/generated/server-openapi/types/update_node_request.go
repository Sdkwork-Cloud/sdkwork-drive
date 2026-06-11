package types


type UpdateNodeRequest struct {
	TenantId string `json:"tenantId"`
	NodeName string `json:"nodeName"`
	ParentNodeId string `json:"parentNodeId"`
	OperatorId string `json:"operatorId"`
}
