package types


type CreateWatchChannelRequest struct {
	Id string `json:"id"`
	TenantId string `json:"tenantId"`
	SpaceId string `json:"spaceId"`
	Address string `json:"address"`
	Token string `json:"token"`
	ChannelType string `json:"channelType"`
	ExpirationEpochMs int `json:"expirationEpochMs"`
	OperatorId string `json:"operatorId"`
}
