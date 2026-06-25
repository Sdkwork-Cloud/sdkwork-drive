package types


type SweepObjectStoreRequest struct {
	DryRun bool `json:"dryRun"`
	Limit int `json:"limit"`
	OperatorId string `json:"operatorId"`
	RequestId string `json:"requestId"`
	TraceId string `json:"traceId"`
}
