export interface ProviderObject {
  providerId: string;
  bucket: string;
  /** Object list entry kind. `prefix` represents an object-store common prefix returned by delimiter-based browsing. */
  objectKind: 'object' | 'prefix';
  /** Drive object key. UTF-8 1-1024 bytes, trimmed relative key; no leading/trailing slash, double slash, NUL, or period-only path segments. */
  objectKey: string;
  contentLength: string;
  contentType?: string | null;
  etag?: string | null;
  versionId?: string | null;
  storageClass?: string | null;
  lastModifiedEpochMs?: string | null;
}
