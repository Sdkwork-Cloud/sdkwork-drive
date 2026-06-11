package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class ExtractArchiveEntriesRequest {
    private String tenantId;
    private List<String> entryPaths;
    private String targetParentNodeId;
    private String operatorId;

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public List<String> getEntryPaths() {
        return this.entryPaths;
    }
    
    public void setEntryPaths(List<String> entryPaths) {
        this.entryPaths = entryPaths;
    }

    public String getTargetParentNodeId() {
        return this.targetParentNodeId;
    }
    
    public void setTargetParentNodeId(String targetParentNodeId) {
        this.targetParentNodeId = targetParentNodeId;
    }

    public String getOperatorId() {
        return this.operatorId;
    }
    
    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }
}
