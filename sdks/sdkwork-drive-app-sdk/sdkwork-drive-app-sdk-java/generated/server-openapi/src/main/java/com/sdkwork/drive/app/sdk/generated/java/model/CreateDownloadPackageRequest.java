package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class CreateDownloadPackageRequest {
    private String tenantId;
    private List<String> nodeIds;
    private String packageName;
    private Integer requestedTtlSeconds;
    private String operatorId;

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public List<String> getNodeIds() {
        return this.nodeIds;
    }
    
    public void setNodeIds(List<String> nodeIds) {
        this.nodeIds = nodeIds;
    }

    public String getPackageName() {
        return this.packageName;
    }
    
    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public Integer getRequestedTtlSeconds() {
        return this.requestedTtlSeconds;
    }
    
    public void setRequestedTtlSeconds(Integer requestedTtlSeconds) {
        this.requestedTtlSeconds = requestedTtlSeconds;
    }

    public String getOperatorId() {
        return this.operatorId;
    }
    
    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }
}
