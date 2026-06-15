export interface CopyNodeRequest {
  id: string;
  tenantId: string;
  targetSpaceId?: string;
  targetParentNodeId?: string;
  nodeName?: string;
  operatorId?: string;
}


