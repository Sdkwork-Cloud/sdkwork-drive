package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class ChangeListResponse {
    private List<Change> items;
    private Integer nextCursor;
    private String nextPageToken;

    public List<Change> getItems() {
        return this.items;
    }
    
    public void setItems(List<Change> items) {
        this.items = items;
    }

    public Integer getNextCursor() {
        return this.nextCursor;
    }
    
    public void setNextCursor(Integer nextCursor) {
        this.nextCursor = nextCursor;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }
    
    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
