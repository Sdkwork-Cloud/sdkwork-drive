export interface PresignUploadPartRequest {
  tenantId: string;
  uploadId?: string;
  requestedTtlSeconds?: number;
}
