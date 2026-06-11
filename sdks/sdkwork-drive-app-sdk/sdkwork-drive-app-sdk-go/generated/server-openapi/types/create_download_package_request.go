package types


type CreateDownloadPackageRequest struct {
	TenantId string `json:"tenantId"`
	NodeIds []string `json:"nodeIds"`
	PackageName string `json:"packageName"`
	RequestedTtlSeconds int `json:"requestedTtlSeconds"`
	OperatorId string `json:"operatorId"`
}
