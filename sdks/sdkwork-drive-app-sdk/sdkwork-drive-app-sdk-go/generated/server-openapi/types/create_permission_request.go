package types


type CreatePermissionRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	SubjectType string `json:"subjectType"`
	SubjectId string `json:"subjectId"`
	Role string `json:"role"`
	OperatorId string `json:"operatorId"`
}
