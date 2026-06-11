export interface MarkUploaderPartUploadedRequest {
  tenantId: string;
  uploadSessionId: string;
  offsetBytes: string;
  sizeBytes: string;
  etag: string;
  checksumSha256Hex?: string;
  uploadedAtEpochMs?: string;
}
