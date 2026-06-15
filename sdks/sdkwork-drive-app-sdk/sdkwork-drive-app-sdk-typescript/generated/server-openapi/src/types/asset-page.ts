import type { AssetItem } from './asset-item';

export interface AssetPage {
  items: AssetItem[];
  nextCursor?: string;
}


