package types


type ProviderObjectList struct {
	ProviderId string `json:"providerId"`
	Bucket string `json:"bucket"`
	Prefix string `json:"prefix"`
	Items []ProviderObject `json:"items"`
	NextPageToken string `json:"nextPageToken"`
}
