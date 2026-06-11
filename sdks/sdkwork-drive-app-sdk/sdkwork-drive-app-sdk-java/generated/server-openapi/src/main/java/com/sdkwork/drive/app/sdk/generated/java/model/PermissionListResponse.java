package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class PermissionListResponse {
    private List<DrivePermission> items;
    private String nextPageToken;

    public List<DrivePermission> getItems() {
        return this.items;
    }
    
    public void setItems(List<DrivePermission> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }
    
    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
