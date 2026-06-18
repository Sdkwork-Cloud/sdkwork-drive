export interface CreateShareLinkRequest {
  id: string;
  token: string;
  role?: 'reader' | 'commenter' | 'writer';
  expiresAtEpochMs?: string;
  downloadLimit?: string;
}
