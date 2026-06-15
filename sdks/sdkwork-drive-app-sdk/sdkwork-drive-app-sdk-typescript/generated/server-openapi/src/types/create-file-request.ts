export interface CreateFileRequest {
  id: string;
  tenantId: string;
  spaceId: string;
  parentNodeId?: string;
  nodeName: string;
  operatorId: string;
  uploadSessionId: string;
  idempotencyKey: string;
  expiresAtEpochMs: string;
  bucket?: string;
  /** Deprecated compatibility field. The service ignores this value and generates an internal sdkwork-drive/v1 object key. */
  objectKey?: string;
}


