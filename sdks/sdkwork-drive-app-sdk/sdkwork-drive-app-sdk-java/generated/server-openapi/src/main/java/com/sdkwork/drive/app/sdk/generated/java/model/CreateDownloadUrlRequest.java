package com.sdkwork.drive.app.sdk.generated.java.model;


public class CreateDownloadUrlRequest {
    private String tenantId;
    private String nodeId;
    private Integer requestedTtlSeconds;

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getNodeId() {
        return this.nodeId;
    }
    
    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public Integer getRequestedTtlSeconds() {
        return this.requestedTtlSeconds;
    }
    
    public void setRequestedTtlSeconds(Integer requestedTtlSeconds) {
        this.requestedTtlSeconds = requestedTtlSeconds;
    }
}
