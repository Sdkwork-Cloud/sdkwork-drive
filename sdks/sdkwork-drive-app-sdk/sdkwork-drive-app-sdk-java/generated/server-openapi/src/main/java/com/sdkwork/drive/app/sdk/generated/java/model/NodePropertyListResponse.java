package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class NodePropertyListResponse {
    private List<DriveNodeProperty> items;
    private String nextPageToken;

    public List<DriveNodeProperty> getItems() {
        return this.items;
    }

    public void setItems(List<DriveNodeProperty> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
