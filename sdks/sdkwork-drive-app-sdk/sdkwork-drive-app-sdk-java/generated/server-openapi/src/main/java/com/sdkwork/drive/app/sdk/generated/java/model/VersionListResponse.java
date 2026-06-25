package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class VersionListResponse {
    private List<FileVersion> items;
    private String nextPageToken;

    public List<FileVersion> getItems() {
        return this.items;
    }

    public void setItems(List<FileVersion> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
