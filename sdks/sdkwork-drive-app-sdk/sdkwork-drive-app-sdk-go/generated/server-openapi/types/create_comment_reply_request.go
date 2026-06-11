package types


type CreateCommentReplyRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	Content string `json:"content"`
	OperatorId string `json:"operatorId"`
}
