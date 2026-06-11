export interface UpdateShareLinkRequest {
  tenantId: string;
  role?: 'reader' | 'commenter' | 'writer';
  expiresAtEpochMs?: string | null;
  downloadLimit?: string | null;
  operatorId?: string;
}
