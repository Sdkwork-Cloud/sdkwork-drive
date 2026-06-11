export interface DriveUser {
  id: string;
  name: string;
  avatar?: string;
  email: string;
}

export interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  spaceId?: string;
  mimeType?: string;
  size?: number; // In bytes
  updatedAt: string;
  ownerId: string;
  parentId?: string;
  isStarred?: boolean;
  color?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
}

export interface DownloadJob {
  id: string;
  type?: 'upload' | 'download';
  downloadKind?: 'single' | 'bundle';
  sourceNodeIds?: string[];
  fileId: string;
  fileName: string;
  fileType: 'file' | 'folder';
  mimeType?: string;
  downloadUrl?: string;
  signedSourceUrl?: string;
  downloadMethod?: string;
  expiresAtEpochMs?: number;
  errorMessage?: string;
  totalSize: number;
  downloadedSize: number;
  progress: number; // 0 - 100
  status: 'connecting' | 'compressing' | 'downloading' | 'uploading' | 'checking' | 'ready' | 'completed' | 'paused' | 'cancelled' | 'failed';
  speed: string;
  timeRemaining: string;
}

const DRIVE_READ_ONLY_VIEW_SECTIONS = new Set(['recent', 'starred', 'shared', 'trash', 'transfer']);

export function isReadOnlyDriveViewSection(section: string): boolean {
  return DRIVE_READ_ONLY_VIEW_SECTIONS.has(section);
}

export function canUploadDriveFileToSection(section: string): boolean {
  return !isReadOnlyDriveViewSection(section);
}

export function canCreateDriveFolderInSection(section: string): boolean {
  return canUploadDriveFileToSection(section) && section !== 'computers';
}
