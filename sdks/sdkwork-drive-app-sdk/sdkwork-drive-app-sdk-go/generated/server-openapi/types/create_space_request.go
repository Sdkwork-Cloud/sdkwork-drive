package types


type CreateSpaceRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	OwnerSubjectType string `json:"ownerSubjectType"`
	OwnerSubjectId string `json:"ownerSubjectId"`
	DisplayName string `json:"displayName"`
	SpaceType string `json:"spaceType"`
	OperatorId string `json:"operatorId"`
}
