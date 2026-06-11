package types


type UpdateCommentReplyRequest struct {
	TenantId string `json:"tenantId"`
	Content string `json:"content"`
	OperatorId string `json:"operatorId"`
}
