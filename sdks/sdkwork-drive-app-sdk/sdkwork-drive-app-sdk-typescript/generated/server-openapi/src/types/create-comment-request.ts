export interface CreateCommentRequest {
  id: string;
  tenantId: string;
  content: string;
  anchor?: string;
  operatorId: string;
}


