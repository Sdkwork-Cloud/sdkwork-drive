export interface CreatePermissionRequest {
  id: string;
  role: 'reader' | 'commenter' | 'writer' | 'owner';
}
