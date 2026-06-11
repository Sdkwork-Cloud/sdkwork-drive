import type { ProviderBucketListItem } from './provider-bucket-list-item';

export interface ProviderBucketList {
  providerId: string;
  configuredBucket: string;
  items: ProviderBucketListItem[];
}
