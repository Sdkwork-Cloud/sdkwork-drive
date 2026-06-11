package com.sdkwork.drive.backend.sdk.generated.java.model;


public class SetDefaultStorageProviderBindingRequest {
    private String tenantId;
    private String spaceId;
    private String providerId;
    private String operatorId;
    private String storageRootPrefix;

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getSpaceId() {
        return this.spaceId;
    }

    public void setSpaceId(String spaceId) {
        this.spaceId = spaceId;
    }

    public String getProviderId() {
        return this.providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getOperatorId() {
        return this.operatorId;
    }

    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }

    public String getStorageRootPrefix() {
        return this.storageRootPrefix;
    }

    public void setStorageRootPrefix(String storageRootPrefix) {
        this.storageRootPrefix = storageRootPrefix;
    }
}
