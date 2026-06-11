export interface ExtractArchiveEntriesRequest {
  tenantId: string;
  entryPaths?: string[];
  targetParentNodeId?: string;
  operatorId?: string;
}
