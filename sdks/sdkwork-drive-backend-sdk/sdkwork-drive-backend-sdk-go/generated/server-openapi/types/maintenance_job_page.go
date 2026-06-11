package types


type MaintenanceJobPage struct {
	Items []MaintenanceJob `json:"items"`
	Page int `json:"page"`
	PageSize int `json:"pageSize"`
	Total int `json:"total"`
}
