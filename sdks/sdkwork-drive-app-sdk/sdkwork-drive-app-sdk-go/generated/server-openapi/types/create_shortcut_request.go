package types


type CreateShortcutRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	ParentNodeId string `json:"parentNodeId"`
	NodeName string `json:"nodeName"`
	TargetNodeId string `json:"targetNodeId"`
	OperatorId string `json:"operatorId"`
}
