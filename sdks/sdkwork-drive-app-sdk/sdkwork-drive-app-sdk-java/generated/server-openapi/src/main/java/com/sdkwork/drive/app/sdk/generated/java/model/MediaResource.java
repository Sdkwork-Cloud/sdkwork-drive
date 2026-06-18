package com.sdkwork.drive.app.sdk.generated.java.model;

import java.util.Map;

public class MediaResource {
    private String mediaResourceId;
    private String mediaType;
    private String contentType;
    private Integer width;
    private Integer height;
    private Integer durationMs;
    private Integer sizeBytes;
    private String checksumSha256;
    private Map<String, Object> metadata;

    public String getMediaResourceId() {
        return this.mediaResourceId;
    }

    public void setMediaResourceId(String mediaResourceId) {
        this.mediaResourceId = mediaResourceId;
    }

    public String getMediaType() {
        return this.mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String getContentType() {
        return this.contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Integer getWidth() {
        return this.width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return this.height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Integer getDurationMs() {
        return this.durationMs;
    }

    public void setDurationMs(Integer durationMs) {
        this.durationMs = durationMs;
    }

    public Integer getSizeBytes() {
        return this.sizeBytes;
    }

    public void setSizeBytes(Integer sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getChecksumSha256() {
        return this.checksumSha256;
    }

    public void setChecksumSha256(String checksumSha256) {
        this.checksumSha256 = checksumSha256;
    }

    public Map<String, Object> getMetadata() {
        return this.metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}
