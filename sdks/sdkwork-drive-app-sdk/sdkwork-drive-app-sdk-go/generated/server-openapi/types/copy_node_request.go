package types


type CopyNodeRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	TargetSpaceId string `json:"targetSpaceId"`
	TargetParentNodeId string `json:"targetParentNodeId"`
	NodeName string `json:"nodeName"`
	OperatorId string `json:"operatorId"`
}
