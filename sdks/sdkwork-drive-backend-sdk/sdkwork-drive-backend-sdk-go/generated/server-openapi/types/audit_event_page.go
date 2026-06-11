package types


type AuditEventPage struct {
	Items []AuditEvent `json:"items"`
	Page int `json:"page"`
	PageSize int `json:"pageSize"`
	Total int `json:"total"`
}
