export interface UpdateLabelRequest {
  tenantId: string;
  displayName?: string;
  color?: string;
  description?: string;
  operatorId: string;
}
