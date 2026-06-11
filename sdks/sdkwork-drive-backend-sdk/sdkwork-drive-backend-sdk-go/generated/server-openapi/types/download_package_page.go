package types


type DownloadPackagePage struct {
	Items []DownloadPackage `json:"items"`
	Page int `json:"page"`
	PageSize int `json:"pageSize"`
	Total int `json:"total"`
}
