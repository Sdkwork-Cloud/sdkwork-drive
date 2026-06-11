package types


type CreateCommentRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	Content string `json:"content"`
	Anchor string `json:"anchor"`
	OperatorId string `json:"operatorId"`
}
