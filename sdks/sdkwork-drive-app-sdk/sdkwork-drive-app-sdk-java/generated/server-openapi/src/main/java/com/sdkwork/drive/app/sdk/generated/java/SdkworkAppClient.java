package com.sdkwork.drive.app.sdk.generated.java;

import com.sdkwork.common.core.Types;
import com.sdkwork.drive.app.sdk.generated.java.http.HttpClient;
import com.sdkwork.drive.app.sdk.generated.java.api.DriveApi;
import com.sdkwork.drive.app.sdk.generated.java.api.NodeLabelsApi;
import com.sdkwork.drive.app.sdk.generated.java.api.NodePropertiesApi;
import com.sdkwork.drive.app.sdk.generated.java.api.NodesApi;
import com.sdkwork.drive.app.sdk.generated.java.api.WatchChannelsApi;

public class SdkworkAppClient {
    private final HttpClient httpClient;
    private DriveApi drive;
    private NodeLabelsApi nodeLabels;
    private NodePropertiesApi nodeProperties;
    private NodesApi nodes;
    private WatchChannelsApi watchChannels;

    public SdkworkAppClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.drive = new DriveApi(httpClient);
        this.nodeLabels = new NodeLabelsApi(httpClient);
        this.nodeProperties = new NodePropertiesApi(httpClient);
        this.nodes = new NodesApi(httpClient);
        this.watchChannels = new WatchChannelsApi(httpClient);
    }

    public SdkworkAppClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.drive = new DriveApi(httpClient);
        this.nodeLabels = new NodeLabelsApi(httpClient);
        this.nodeProperties = new NodePropertiesApi(httpClient);
        this.nodes = new NodesApi(httpClient);
        this.watchChannels = new WatchChannelsApi(httpClient);
    }

    public DriveApi getDrive() {
        return this.drive;
    }

    public NodeLabelsApi getNodeLabels() {
        return this.nodeLabels;
    }

    public NodePropertiesApi getNodeProperties() {
        return this.nodeProperties;
    }

    public NodesApi getNodes() {
        return this.nodes;
    }

    public WatchChannelsApi getWatchChannels() {
        return this.watchChannels;
    }

    public SdkworkAppClient setApiKey(String apiKey) {
        httpClient.setApiKey(apiKey);
        return this;
    }

    public SdkworkAppClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkAppClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkAppClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
