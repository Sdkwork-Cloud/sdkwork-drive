package com.sdkwork.drive.backend.sdk.generated.java.model;

import java.util.List;

public class LabelListResponse {
    private List<DriveLabel> items;
    private String nextPageToken;

    public List<DriveLabel> getItems() {
        return this.items;
    }

    public void setItems(List<DriveLabel> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
