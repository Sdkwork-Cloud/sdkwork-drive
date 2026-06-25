package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class AssetCollectionPage {
    private List<AssetCollection> items;
    private String nextCursor;

    public List<AssetCollection> getItems() {
        return this.items;
    }

    public void setItems(List<AssetCollection> items) {
        this.items = items;
    }

    public String getNextCursor() {
        return this.nextCursor;
    }

    public void setNextCursor(String nextCursor) {
        this.nextCursor = nextCursor;
    }
}
