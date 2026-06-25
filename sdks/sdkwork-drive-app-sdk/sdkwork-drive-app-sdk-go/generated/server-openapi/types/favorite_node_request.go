package types


type FavoriteNodeRequest struct {
	SubjectType string `json:"subjectType"`
	SubjectId string `json:"subjectId"`
	OperatorId string `json:"operatorId"`
}
