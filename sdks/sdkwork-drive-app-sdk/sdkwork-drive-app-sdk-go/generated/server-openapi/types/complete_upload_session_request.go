package types


type CompleteUploadSessionRequest struct {
	TenantId string `json:"tenantId"`
	UploadId string `json:"uploadId"`
	ContentType string `json:"contentType"`
	ContentLength int `json:"contentLength"`
	ChecksumSha256Hex string `json:"checksumSha256Hex"`
	OperatorId string `json:"operatorId"`
	Parts []CompletedUploadPart `json:"parts"`
}
