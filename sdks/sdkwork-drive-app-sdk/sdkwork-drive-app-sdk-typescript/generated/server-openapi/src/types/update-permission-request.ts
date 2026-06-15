export interface UpdatePermissionRequest {
  tenantId: string;
  role?: 'reader' | 'commenter' | 'writer' | 'owner';
  operatorId?: string;
}


