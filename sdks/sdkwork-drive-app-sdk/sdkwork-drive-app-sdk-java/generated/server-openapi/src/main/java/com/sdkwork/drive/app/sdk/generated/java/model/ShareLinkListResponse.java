package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class ShareLinkListResponse {
    private List<DriveShareLink> items;
    private String nextPageToken;

    public List<DriveShareLink> getItems() {
        return this.items;
    }

    public void setItems(List<DriveShareLink> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
