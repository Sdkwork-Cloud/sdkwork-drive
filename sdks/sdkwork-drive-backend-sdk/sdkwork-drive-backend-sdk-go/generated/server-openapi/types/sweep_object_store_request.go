package types


type SweepObjectStoreRequest struct {
	DryRun bool `json:"dryRun"`
	Limit int `json:"limit"`
	OperatorId string `json:"operatorId"`
	CorrelationId string `json:"correlationId"`
	TraceId string `json:"traceId"`
}
