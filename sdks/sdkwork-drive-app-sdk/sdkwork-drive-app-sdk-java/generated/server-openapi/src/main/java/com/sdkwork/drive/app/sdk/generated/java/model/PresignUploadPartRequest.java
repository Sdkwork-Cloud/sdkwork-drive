package com.sdkwork.drive.app.sdk.generated.java.model;


public class PresignUploadPartRequest {
    private String tenantId;
    private String uploadId;
    private Integer requestedTtlSeconds;

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getUploadId() {
        return this.uploadId;
    }
    
    public void setUploadId(String uploadId) {
        this.uploadId = uploadId;
    }

    public Integer getRequestedTtlSeconds() {
        return this.requestedTtlSeconds;
    }
    
    public void setRequestedTtlSeconds(Integer requestedTtlSeconds) {
        this.requestedTtlSeconds = requestedTtlSeconds;
    }
}
