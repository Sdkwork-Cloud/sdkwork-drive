import type { MediaResource } from './media-resource';

export interface CreateAssetRequest {
  tenantId: string;
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


