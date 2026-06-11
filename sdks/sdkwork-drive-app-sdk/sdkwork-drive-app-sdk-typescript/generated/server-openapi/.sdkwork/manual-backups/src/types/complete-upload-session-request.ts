import type { CompletedUploadPart } from './completed-upload-part';

export interface CompleteUploadSessionRequest {
  tenantId: string;
  uploadId?: string;
  contentType: string;
  contentLength: string;
  checksumSha256Hex: string;
  operatorId?: string;
  /** Completed multipart upload parts ordered by ascending unique partNo. */
  parts: CompletedUploadPart[];
}
