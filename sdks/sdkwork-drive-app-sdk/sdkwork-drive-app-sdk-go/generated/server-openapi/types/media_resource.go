package types


type MediaResource struct {
	MediaResourceId string `json:"mediaResourceId"`
	MediaType string `json:"mediaType"`
	ContentType string `json:"contentType"`
	Width int `json:"width"`
	Height int `json:"height"`
	DurationMs int `json:"durationMs"`
	SizeBytes int `json:"sizeBytes"`
	ChecksumSha256 string `json:"checksumSha256"`
	Metadata map[string]interface{} `json:"metadata"`
}
