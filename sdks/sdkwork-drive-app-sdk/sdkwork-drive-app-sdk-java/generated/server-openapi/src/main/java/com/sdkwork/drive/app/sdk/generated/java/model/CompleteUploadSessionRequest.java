package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.List;

public class CompleteUploadSessionRequest {
    private String tenantId;
    private String uploadId;
    private String contentType;
    private Integer contentLength;
    private String checksumSha256Hex;
    private String operatorId;
    private List<CompletedUploadPart> parts;

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

    public String getContentType() {
        return this.contentType;
    }
    
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Integer getContentLength() {
        return this.contentLength;
    }
    
    public void setContentLength(Integer contentLength) {
        this.contentLength = contentLength;
    }

    public String getChecksumSha256Hex() {
        return this.checksumSha256Hex;
    }
    
    public void setChecksumSha256Hex(String checksumSha256Hex) {
        this.checksumSha256Hex = checksumSha256Hex;
    }

    public String getOperatorId() {
        return this.operatorId;
    }
    
    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }

    public List<CompletedUploadPart> getParts() {
        return this.parts;
    }
    
    public void setParts(List<CompletedUploadPart> parts) {
        this.parts = parts;
    }
}
