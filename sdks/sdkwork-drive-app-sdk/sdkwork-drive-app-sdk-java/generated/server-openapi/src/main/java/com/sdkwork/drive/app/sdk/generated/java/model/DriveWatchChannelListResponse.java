package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class DriveWatchChannelListResponse {
    private List<DriveWatchChannel> items;
    private String nextPageToken;

    public List<DriveWatchChannel> getItems() {
        return this.items;
    }

    public void setItems(List<DriveWatchChannel> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
