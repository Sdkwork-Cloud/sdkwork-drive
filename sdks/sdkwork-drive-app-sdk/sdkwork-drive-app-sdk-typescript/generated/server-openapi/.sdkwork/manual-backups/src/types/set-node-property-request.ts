export interface SetNodePropertyRequest {
  tenantId: string;
  value: string;
  visibility?: 'private' | 'app_public';
  operatorId?: string;
}
