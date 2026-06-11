export interface CreateFolderRequest {
  id: string;
  tenantId: string;
  spaceId: string;
  parentNodeId?: string;
  nodeName: string;
  operatorId: string;
}
