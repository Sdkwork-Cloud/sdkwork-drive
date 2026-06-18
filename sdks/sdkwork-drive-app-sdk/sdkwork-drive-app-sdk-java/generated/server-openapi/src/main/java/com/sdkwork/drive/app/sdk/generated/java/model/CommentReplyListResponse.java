package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class CommentReplyListResponse {
    private List<DriveCommentReply> items;
    private String nextPageToken;

    public List<DriveCommentReply> getItems() {
        return this.items;
    }

    public void setItems(List<DriveCommentReply> items) {
        this.items = items;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}
