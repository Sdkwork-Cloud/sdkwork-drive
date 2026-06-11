package com.sdkwork.drive.app.sdk.generated.java.model;


public class UpdateCommentRequest {
    private String tenantId;
    private String content;
    private String anchor;
    private Boolean resolved;
    private String operatorId;

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getContent() {
        return this.content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }

    public String getAnchor() {
        return this.anchor;
    }
    
    public void setAnchor(String anchor) {
        this.anchor = anchor;
    }

    public Boolean getResolved() {
        return this.resolved;
    }
    
    public void setResolved(Boolean resolved) {
        this.resolved = resolved;
    }

    public String getOperatorId() {
        return this.operatorId;
    }
    
    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }
}
