import type { EffectivePermission } from './effective-permission';

export interface EffectivePermissionListResponse {
  items: EffectivePermission[];
  nextPageToken?: string;
}
