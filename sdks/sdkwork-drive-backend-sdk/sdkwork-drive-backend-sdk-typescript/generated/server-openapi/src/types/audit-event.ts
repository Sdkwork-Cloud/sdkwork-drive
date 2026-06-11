export interface AuditEvent {
  id: string;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  operatorId: string;
  requestId?: string;
  traceId?: string;
  createdAt: string;
}
