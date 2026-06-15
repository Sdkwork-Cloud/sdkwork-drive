import type { NodeLabel } from './node-label';

export interface NodeLabelListResponse {
  items: NodeLabel[];
  nextPageToken?: string | null;
}


