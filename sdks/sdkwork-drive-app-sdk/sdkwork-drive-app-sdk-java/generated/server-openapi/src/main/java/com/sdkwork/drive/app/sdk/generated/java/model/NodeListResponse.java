package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class NodeListResponse {
    private List<DriveNode> items;
    private String nextPageToken;

    public List<DriveNode> getItems() {
        return this.items;
    }

    public void setItems(List<DriveNode> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
