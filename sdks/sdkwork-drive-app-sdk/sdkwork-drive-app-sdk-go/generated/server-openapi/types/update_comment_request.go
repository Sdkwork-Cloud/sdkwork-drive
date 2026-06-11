package types


type UpdateCommentRequest struct {
	TenantId string `json:"tenantId"`
	Content string `json:"content"`
	Anchor string `json:"anchor"`
	Resolved bool `json:"resolved"`
	OperatorId string `json:"operatorId"`
}
