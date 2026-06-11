export interface CreateShortcutRequest {
  id: string;
  tenantId: string;
  spaceId: string;
  parentNodeId?: string;
  nodeName: string;
  targetNodeId: string;
  operatorId: string;
}
