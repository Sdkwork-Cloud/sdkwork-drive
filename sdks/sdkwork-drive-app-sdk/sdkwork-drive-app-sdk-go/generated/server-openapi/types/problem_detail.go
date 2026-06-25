package types


type ProblemDetail struct {
	Type string `json:"type"`
	Title string `json:"title"`
	Status int `json:"status"`
	Detail string `json:"detail"`
	Instance string `json:"instance"`
	Code string `json:"code"`
	TraceId string `json:"traceId"`
	RequestId string `json:"requestId"`
	Errors []FieldError `json:"errors"`
}
