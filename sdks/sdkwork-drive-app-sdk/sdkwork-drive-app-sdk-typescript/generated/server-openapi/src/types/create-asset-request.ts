import type { MediaResource } from './media-resource';

export interface CreateAssetRequest {
  organizationId?: string;
  /** Existing Drive node to expose through /assets. */
  driveNodeId?: string;
  virtualReference?: Record<string, unknown>;
  title?: string;
  description?: string;
  scene?: string;
  source?: string;
  tags?: string[];
}
