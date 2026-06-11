export interface FavoriteNodeRequest {
  tenantId: string;
  subjectType: 'user' | 'group' | 'domain' | 'app';
  subjectId: string;
  operatorId?: string;
}
