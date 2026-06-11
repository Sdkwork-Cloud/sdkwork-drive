package types


type FavoriteNodeRequest struct {
	TenantId string `json:"tenantId"`
	SubjectType string `json:"subjectType"`
	SubjectId string `json:"subjectId"`
	OperatorId string `json:"operatorId"`
}
