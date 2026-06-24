package types


type MediaResource struct {
	Id string `json:"id"`
	Kind string `json:"kind"`
	Source string `json:"source"`
	Uri string `json:"uri"`
	FileName string `json:"fileName"`
	MimeType string `json:"mimeType"`
	SizeBytes string `json:"sizeBytes"`
	Checksum map[string]interface{} `json:"checksum"`
	Url string `json:"url"`
	MediaResourceId string `json:"mediaResourceId"`
	MediaType string `json:"mediaType"`
	ContentType string `json:"contentType"`
	Width int `json:"width"`
	Height int `json:"height"`
	DurationMs int `json:"durationMs"`
	ChecksumSha256 string `json:"checksumSha256"`
	Metadata map[string]interface{} `json:"metadata"`
}
