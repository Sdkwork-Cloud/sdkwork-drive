package types


type SetDefaultStorageProviderBindingRequest struct {
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	ProviderId string `json:"providerId"`
	OperatorId string `json:"operatorId"`
	StorageRootPrefix string `json:"storageRootPrefix"`
}
