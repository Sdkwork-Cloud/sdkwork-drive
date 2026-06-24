export interface MediaResource {
  id?: string;
  kind?: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'file' | 'folder' | 'generated' | 'other';
  source?: 'drive' | 'external_url' | 'data_url' | 'provider_asset' | 'generated';
  uri?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: string;
  checksum?: Record<string, unknown>;
  url?: string;
  /** Legacy alias for id. */
  mediaResourceId?: string;
  /** Legacy alias for kind. */
  mediaType?: string;
  /** Legacy alias for mimeType. */
  contentType?: string;
  width?: number;
  height?: number;
  durationMs?: string;
  /** Legacy checksum field. */
  checksumSha256?: string;
  metadata?: Record<string, unknown>;
}
