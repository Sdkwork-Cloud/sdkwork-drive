package types


type AuditEvent struct {
	Id int `json:"id"`
	TenantId string `json:"tenantId"`
	Action string `json:"action"`
	ResourceType string `json:"resourceType"`
	ResourceId string `json:"resourceId"`
	OperatorId string `json:"operatorId"`
	RequestId string `json:"requestId"`
	TraceId string `json:"traceId"`
	CreatedAt string `json:"createdAt"`
}
