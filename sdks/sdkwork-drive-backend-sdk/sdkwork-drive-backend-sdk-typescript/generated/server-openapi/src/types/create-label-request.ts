export interface CreateLabelRequest {
  id: string;
  tenantId: string;
  labelKey: string;
  displayName: string;
  color?: string;
  description?: string;
  operatorId: string;
}
