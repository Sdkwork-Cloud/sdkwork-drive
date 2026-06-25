package com.sdkwork.drive.admin.storage.sdk.generated.java.model;

import java.util.List;

public class ProviderBucketList {
    private String providerId;
    private String configuredBucket;
    private List<ProviderBucketListItem> items;

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getConfiguredBucket() {
        return this.configuredBucket;
    }

    public void setConfiguredBucket(String configuredBucket) {
        this.configuredBucket = configuredBucket;
    }

    public List<ProviderBucketListItem> getItems() {
        return this.items;
    }

    public void setItems(List<ProviderBucketListItem> items) {
        this.items = items;
    }
}
