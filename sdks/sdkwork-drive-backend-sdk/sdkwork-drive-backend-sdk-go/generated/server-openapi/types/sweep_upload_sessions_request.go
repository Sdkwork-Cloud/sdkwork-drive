package types


type SweepUploadSessionsRequest struct {
	NowEpochMs int `json:"nowEpochMs"`
	DryRun bool `json:"dryRun"`
	Limit int `json:"limit"`
	OperatorId string `json:"operatorId"`
	CorrelationId string `json:"correlationId"`
	TraceId string `json:"traceId"`
}
