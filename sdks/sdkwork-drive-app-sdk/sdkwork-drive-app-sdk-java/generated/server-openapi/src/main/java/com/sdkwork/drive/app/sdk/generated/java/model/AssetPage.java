package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class AssetPage {
    private List<AssetItem> items;
    private String nextCursor;

    public List<AssetItem> getItems() {
        return this.items;
    }

    public void setItems(List<AssetItem> items) {
        this.items = items;
    }

    public String getNextCursor() {
        return this.nextCursor;
    }

    public void setNextCursor(String nextCursor) {
        this.nextCursor = nextCursor;
    }
}
