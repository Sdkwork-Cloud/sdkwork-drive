import type { DriveWatchChannel } from './drive-watch-channel';

export interface DriveWatchChannelListResponse {
  items: DriveWatchChannel[];
  nextPageToken?: string | null;
}


