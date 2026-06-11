import type { AuditEvent } from './audit-event';

export interface AuditEventPage {
  items: AuditEvent[];
  page: number;
  pageSize: number;
  total: string;
}
