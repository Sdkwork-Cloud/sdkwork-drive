import type { DriveShareLink } from './drive-share-link';

export interface ShareLinkListResponse {
  items: DriveShareLink[];
  nextPageToken?: string;
}


