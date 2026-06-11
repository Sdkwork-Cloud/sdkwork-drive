package app

import (
    "sdkwork-drive-app-sdk-generated-go/api"
    sdkhttp "sdkwork-drive-app-sdk-generated-go/http"
)

type SdkworkAppClient struct {
    http *sdkhttp.Client
    Drive *api.DriveApi
    NodeLabels *api.NodeLabelsApi
    NodeProperties *api.NodePropertiesApi
    Nodes *api.NodesApi
    WatchChannels *api.WatchChannelsApi
}

func NewSdkworkAppClient(baseURL string) *SdkworkAppClient {
    cfg := sdkhttp.NewDefaultConfig(baseURL)
    return NewSdkworkAppClientWithConfig(cfg)
}

func NewSdkworkAppClientWithConfig(config sdkhttp.Config) *SdkworkAppClient {
    client := sdkhttp.NewClient(config)
    return &SdkworkAppClient{
        http: client,
        Drive: api.NewDriveApi(client),
        NodeLabels: api.NewNodeLabelsApi(client),
        NodeProperties: api.NewNodePropertiesApi(client),
        Nodes: api.NewNodesApi(client),
        WatchChannels: api.NewWatchChannelsApi(client),
    }
}

func (c *SdkworkAppClient) SetApiKey(apiKey string) *SdkworkAppClient {
    c.http.SetApiKey(apiKey)
    return c
}

func (c *SdkworkAppClient) SetAuthToken(token string) *SdkworkAppClient {
    c.http.SetAuthToken(token)
    return c
}

func (c *SdkworkAppClient) SetAccessToken(token string) *SdkworkAppClient {
    c.http.SetAccessToken(token)
    return c
}

func (c *SdkworkAppClient) SetHeader(key string, value string) *SdkworkAppClient {
    c.http.SetHeader(key, value)
    return c
}

func (c *SdkworkAppClient) Http() *sdkhttp.Client {
    return c.http
}
