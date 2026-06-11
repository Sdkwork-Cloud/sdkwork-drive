package com.sdkwork.drive.backend.sdk.generated.java.model;

import java.util.List;

public class ProviderObjectList {
    private String providerId;
    private String bucket;
    private String prefix;
    private List<ProviderObject> items;
    private String nextPageToken;

    public String getProviderId() {
        return this.providerId;
    }
    
    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getBucket() {
        return this.bucket;
    }
    
    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getPrefix() {
        return this.prefix;
    }
    
    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public List<ProviderObject> getItems() {
        return this.items;
    }
    
    public void setItems(List<ProviderObject> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }
    
    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
