package com.sdkwork.drive.app.sdk.generated.java.model;


public class CreateShareLinkRequest {
    private String id;
    private String tenantId;
    private String token;
    private String role;
    private Integer expiresAtEpochMs;
    private Integer downloadLimit;
    private String operatorId;

    public String getId() {
        return this.id;
    }
    
    public void setId(String id) {
        this.id = id;
    }

    public String getTenantId() {
        return this.tenantId;
    }
    
    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getToken() {
        return this.token;
    }
    
    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return this.role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }

    public Integer getExpiresAtEpochMs() {
        return this.expiresAtEpochMs;
    }
    
    public void setExpiresAtEpochMs(Integer expiresAtEpochMs) {
        this.expiresAtEpochMs = expiresAtEpochMs;
    }

    public Integer getDownloadLimit() {
        return this.downloadLimit;
    }
    
    public void setDownloadLimit(Integer downloadLimit) {
        this.downloadLimit = downloadLimit;
    }

    public String getOperatorId() {
        return this.operatorId;
    }
    
    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }
}
