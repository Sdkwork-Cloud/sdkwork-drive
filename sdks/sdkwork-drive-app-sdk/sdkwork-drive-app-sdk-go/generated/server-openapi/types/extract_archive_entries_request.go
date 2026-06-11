package types


type ExtractArchiveEntriesRequest struct {
	TenantId string `json:"tenantId"`
	EntryPaths []string `json:"entryPaths"`
	TargetParentNodeId string `json:"targetParentNodeId"`
	OperatorId string `json:"operatorId"`
}
