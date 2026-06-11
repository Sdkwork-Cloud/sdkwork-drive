package com.sdkwork.drive.backend.sdk.generated.java.model;

import java.util.List;

public class AuditEventPage {
    private List<AuditEvent> items;
    private Integer page;
    private Integer pageSize;
    private Integer total;

    public List<AuditEvent> getItems() {
        return this.items;
    }
    
    public void setItems(List<AuditEvent> items) {
        this.items = items;
    }

    public Integer getPage() {
        return this.page;
    }
    
    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getPageSize() {
        return this.pageSize;
    }
    
    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public Integer getTotal() {
        return this.total;
    }
    
    public void setTotal(Integer total) {
        this.total = total;
    }
}
