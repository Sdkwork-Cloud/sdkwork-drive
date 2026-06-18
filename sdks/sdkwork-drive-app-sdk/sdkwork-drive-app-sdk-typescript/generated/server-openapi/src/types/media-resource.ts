export interface MediaResource {
  mediaResourceId?: string;
  mediaType?: string;
  contentType?: string;
  width?: number;
  height?: number;
  durationMs?: string;
  sizeBytes?: string;
  checksumSha256?: string;
  metadata?: Record<string, unknown>;
}
