import type { AssetCollection } from './asset-collection';

export interface AssetCollectionPage {
  items: AssetCollection[];
  nextCursor?: string;
}
