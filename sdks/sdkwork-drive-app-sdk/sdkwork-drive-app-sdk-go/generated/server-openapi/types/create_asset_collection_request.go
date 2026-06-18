package types


type CreateAssetCollectionRequest struct {
	OrganizationId string `json:"organizationId"`
	Title string `json:"title"`
	Description string `json:"description"`
	CollectionType string `json:"collectionType"`
	Visibility string `json:"visibility"`
}
