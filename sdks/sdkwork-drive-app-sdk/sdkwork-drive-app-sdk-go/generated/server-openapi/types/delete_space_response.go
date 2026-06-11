package types


type DeleteSpaceResponse struct {
	Deleted bool `json:"deleted"`
	Space DriveSpace `json:"space"`
	DeletedNodeCount int `json:"deletedNodeCount"`
}
