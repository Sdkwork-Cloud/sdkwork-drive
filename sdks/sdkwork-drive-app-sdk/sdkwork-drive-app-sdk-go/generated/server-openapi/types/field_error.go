package types


type FieldError struct {
	Field string `json:"field"`
	Message string `json:"message"`
	Code string `json:"code"`
}
