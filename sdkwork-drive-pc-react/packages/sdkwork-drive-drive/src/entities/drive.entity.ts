
export type DriveItemType = 'folder' | 'file';

export interface DriveItem {
  id: string;
  parentId: string | null;
  name: string;
  type: DriveItemType;
  path?: string;
  size: number;
  mimeType?: string;
  status?: string;
  previewUrl?: string;
  objectKey?: string;
  updatedAt: number;
  createdAt: number;
  owner?: string;
  isShared?: boolean;
  thumbnailUrl?: string;
  
  isStarred?: boolean;
  trashedAt?: number | null;
  accessedAt?: number;
}

export interface DriveMetadata {
  id: string;
  uuid: string;
  createdAt: number;
  updatedAt: number;
  isStarred?: boolean;
  trashedAt?: number | null;
  accessedAt?: number;
  labels?: string[];
}

export interface DriveStats {
  usedBytes: number;
  totalBytes: number;
  fileCount: number;
}

export interface TransferTask {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}
