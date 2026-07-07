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
func (a *NodesApi) ShortcutsCreate(body sdktypes.CreateShortcutRequest) (sdktypes.NodesShortcutsCreateResponse201, error) {
    raw, err := a.client.Post(AppApiPath("/drive/nodes/shortcuts"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.NodesShortcutsCreateResponse201
        return zero, err
    }
    return decodeResult[sdktypes.NodesShortcutsCreateResponse201](raw)
}
