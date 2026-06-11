package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class EffectivePermissionListResponse {
    private List<EffectivePermission> items;
    private String nextPageToken;

    public List<EffectivePermission> getItems() {
        return this.items;
    }
    
    public void setItems(List<EffectivePermission> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }
    
    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
