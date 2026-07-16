package com.sdkwork.drive.app.sdk.generated.java.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.drive.app.sdk.generated.java.http.HttpClient;
import com.sdkwork.drive.app.sdk.generated.java.model.*;
import java.util.List;
import java.util.Map;

public class NodesApi {
    private final HttpClient client;

    public NodesApi(HttpClient client) {
        this.client = client;
    }

    /** Create a shortcut node */
    public DriveNodeHttpResponse shortcutsCreate(CreateShortcutRequest body) throws Exception {
        Object raw = client.post(ApiPaths.appPath("/drive/nodes/shortcuts"), body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<DriveNodeHttpResponse>() {});
    }




}
