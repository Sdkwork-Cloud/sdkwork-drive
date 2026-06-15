export interface CreateShareLinkRequest {
  id: string;
  tenantId: string;
  token: string;
  role?: 'reader' | 'commenter' | 'writer';
  expiresAtEpochMs?: string;
  downloadLimit?: string;
  operatorId: string;
}


