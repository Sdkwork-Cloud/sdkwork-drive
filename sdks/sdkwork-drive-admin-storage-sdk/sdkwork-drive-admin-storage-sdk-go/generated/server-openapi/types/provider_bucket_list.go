package types


type ProviderBucketList struct {
	ProviderId string `json:"providerId"`
	ConfiguredBucket string `json:"configuredBucket"`
	Items []ProviderBucketListItem `json:"items"`
}
