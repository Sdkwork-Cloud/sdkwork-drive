package com.sdkwork.drive.app.sdk.generated.java.model;


public class DeleteSpaceResponse {
    private Boolean deleted;
    private DriveSpace space;
    private Integer deletedNodeCount;

    public Boolean getDeleted() {
        return this.deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public DriveSpace getSpace() {
        return this.space;
    }

    public void setSpace(DriveSpace space) {
        this.space = space;
    }

    public Integer getDeletedNodeCount() {
        return this.deletedNodeCount;
    }

    public void setDeletedNodeCount(Integer deletedNodeCount) {
        this.deletedNodeCount = deletedNodeCount;
    }
}
