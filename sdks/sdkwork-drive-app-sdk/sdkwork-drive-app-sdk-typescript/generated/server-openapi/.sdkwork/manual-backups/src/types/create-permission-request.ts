export interface CreatePermissionRequest {
  id: string;
  tenantId: string;
  subjectType: string;
  subjectId: string;
  role: 'reader' | 'commenter' | 'writer' | 'owner';
  operatorId: string;
}


