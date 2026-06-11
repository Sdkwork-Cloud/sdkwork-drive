import type { StorageProvider } from './storage-provider';

export interface StorageProviderBinding {
  id: string;
  tenantId: string;
  spaceId?: string;
  providerId: string;
  bindingScope: 'tenant' | 'space';
  purpose: 'primary';
  lifecycleStatus: string;
  version: string;
  storageProvider: StorageProvider;
  /** Storage binding root prefix. UTF-8 1-512 bytes, trimmed relative prefix; no leading/trailing slash, double slash, NUL, or period-only path segments. */
  storageRootPrefix: string;
}
