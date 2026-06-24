package types


type SetDefaultStorageProviderBindingRequest struct {
	SpaceId string `json:"spaceId"`
	SpaceType string `json:"spaceType"`
	ProviderId string `json:"providerId"`
	OperatorId string `json:"operatorId"`
	StorageRootPrefix string `json:"storageRootPrefix"`
}
