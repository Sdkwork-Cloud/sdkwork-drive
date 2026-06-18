package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class CommentListResponse {
    private List<DriveComment> items;
    private String nextPageToken;

    public List<DriveComment> getItems() {
        return this.items;
    }

    public void setItems(List<DriveComment> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
