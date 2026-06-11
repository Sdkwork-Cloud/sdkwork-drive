package com.sdkwork.drive.backend.sdk.generated.java;

import com.sdkwork.common.core.Types;
import com.sdkwork.drive.backend.sdk.generated.java.http.HttpClient;
import com.sdkwork.drive.backend.sdk.generated.java.api.DriveApi;
import com.sdkwork.drive.backend.sdk.generated.java.api.LabelsApi;

public class SdkworkBackendClient {
    private final HttpClient httpClient;
    private DriveApi drive;
    private LabelsApi labels;

    public SdkworkBackendClient(String baseUrl) {
        this.httpClient = new HttpClient(baseUrl);
        this.drive = new DriveApi(httpClient);
        this.labels = new LabelsApi(httpClient);
    }

    public SdkworkBackendClient(Types.SdkConfig config) {
        this.httpClient = new HttpClient(config);
        this.drive = new DriveApi(httpClient);
        this.labels = new LabelsApi(httpClient);
    }

    public DriveApi getDrive() {
        return this.drive;
    }

    public LabelsApi getLabels() {
        return this.labels;
    }

    public SdkworkBackendClient setApiKey(String apiKey) {
        httpClient.setApiKey(apiKey);
        return this;
    }

    public SdkworkBackendClient setAuthToken(String token) {
        httpClient.setAuthToken(token);
        return this;
    }

    public SdkworkBackendClient setAccessToken(String token) {
        httpClient.setAccessToken(token);
        return this;
    }

    public SdkworkBackendClient setHeader(String key, String value) {
        httpClient.setHeader(key, value);
        return this;
    }

    public HttpClient getHttpClient() {
        return httpClient;
    }
}
