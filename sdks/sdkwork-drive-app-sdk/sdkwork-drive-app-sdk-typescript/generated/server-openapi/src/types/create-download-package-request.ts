export interface CreateDownloadPackageRequest {
  tenantId: string;
  nodeIds: string[];
  packageName?: string;
  requestedTtlSeconds?: number;
  operatorId?: string;
}
