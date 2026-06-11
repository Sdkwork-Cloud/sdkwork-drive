import type { FileVersion } from './file-version';

export interface VersionListResponse {
  items: FileVersion[];
  nextPageToken?: string;
}
