package types


type ProblemDetail struct {
	Type string `json:"type"`
	Title string `json:"title"`
	Status int `json:"status"`
	Detail string `json:"detail"`
	Code string `json:"code"`
	TraceId string `json:"traceId"`
	RequestId string `json:"requestId"`
}
