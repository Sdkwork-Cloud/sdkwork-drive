export interface UpdateCommentRequest {
  tenantId: string;
  content?: string;
  anchor?: string;
  resolved?: boolean;
  operatorId?: string;
}


