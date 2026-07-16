package api

import (
    sdktypes "sdkwork-drive-app-sdk-generated-go/types"
    sdkhttp "sdkwork-drive-app-sdk-generated-go/http"
)

type NodesApi struct {
    client *sdkhttp.Client
}

func NewNodesApi(client *sdkhttp.Client) *NodesApi {
    return &NodesApi{client: client}
}

// Create a shortcut node
func (a *NodesApi) ShortcutsCreate(body sdktypes.CreateShortcutRequest) (sdktypes.DriveNodeHttpResponse, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/shortcuts"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DriveNodeHttpResponse
        return zero, err
    }
    return decodeResult[sdktypes.DriveNodeHttpResponse](raw)
}
