package com.sdkwork.drive.backend.sdk.generated.java.model;


public class UpdateQuotaPolicyRequest {
    private Integer quotaBytes;
    private Boolean clearTenantPolicy;
    private String operatorId;

    public Integer getQuotaBytes() {
        return this.quotaBytes;
    }

    public void setQuotaBytes(Integer quotaBytes) {
        this.quotaBytes = quotaBytes;
    }

    public Boolean getClearTenantPolicy() {
        return this.clearTenantPolicy;
    }

    public void setClearTenantPolicy(Boolean clearTenantPolicy) {
        this.clearTenantPolicy = clearTenantPolicy;
    }

    public String getOperatorId() {
        return this.operatorId;
    }

    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }
}
