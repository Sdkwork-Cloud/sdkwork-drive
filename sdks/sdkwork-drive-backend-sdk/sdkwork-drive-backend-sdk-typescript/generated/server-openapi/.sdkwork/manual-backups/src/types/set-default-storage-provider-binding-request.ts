export interface SetDefaultStorageProviderBindingRequest {
  tenantId: string;
  spaceId?: string;
  providerId: string;
  operatorId: string;
  /** Storage binding root prefix. UTF-8 1-512 bytes, trimmed relative prefix; no leading/trailing slash, double slash, NUL, or period-only path segments. */
  storageRootPrefix?: string;
}
