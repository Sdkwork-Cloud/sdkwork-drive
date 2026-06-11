import type { ProviderObject } from './provider-object';

export interface ProviderObjectList {
  providerId: string;
  bucket: string;
  prefix?: string | null;
  items: ProviderObject[];
  nextPageToken?: string | null;
}
