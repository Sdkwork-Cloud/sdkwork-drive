package com.sdkwork.drive.backend.sdk.generated.java.model;


public class SweepUploadSessionsRequest {
    private Integer nowEpochMs;
    private Boolean dryRun;
    private Integer limit;
    private String operatorId;
    private String correlationId;
    private String traceId;

    public Integer getNowEpochMs() {
        return this.nowEpochMs;
    }

    public void setNowEpochMs(Integer nowEpochMs) {
        this.nowEpochMs = nowEpochMs;
    }

    public Boolean getDryRun() {
        return this.dryRun;
    }

    public void setDryRun(Boolean dryRun) {
        this.dryRun = dryRun;
    }

    public Integer getLimit() {
        return this.limit;
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }

    public String getOperatorId() {
        return this.operatorId;
    }

    public void setOperatorId(String operatorId) {
        this.operatorId = operatorId;
    }

    public String getCorrelationId() {
        return this.correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public String getTraceId() {
        return this.traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }
}
