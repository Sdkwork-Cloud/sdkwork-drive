import type { DriveFile } from 'sdkwork-drive-pc-types';
import type { DriveFileService } from 'sdkwork-drive-pc-core';
import type { DriveSection } from '../pages/DrivePage';

export const FILE_BROWSER_SORT_FETCH_CAP = 500;

export function isDefaultFileBrowserSort(
  sortBy: string,
  sortOrder: string,
): boolean {
  return sortBy === 'name' && sortOrder === 'asc';
}

export function mergeUniqueDriveFiles(
  current: readonly DriveFile[],
  incoming: readonly DriveFile[],
): DriveFile[] {
  const seen = new Set(current.map((file) => file.id));
  const merged = [...current];
  for (const file of incoming) {
    if (!seen.has(file.id)) {
      merged.push(file);
      seen.add(file.id);
    }
  }
  return merged;
}

export async function fetchRemainingFileBrowserPages({
  fileService,
  activeSection,
  searchQuery,
  parentId,
  pageSize,
  initialFiles,
  initialNextPageToken,
  signal,
}: {
  fileService: DriveFileService;
  activeSection: DriveSection;
  searchQuery: string;
  parentId: string | null;
  pageSize: number;
  initialFiles: readonly DriveFile[];
  initialNextPageToken?: string;
  signal?: AbortSignal;
}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  let merged = [...initialFiles];
  let nextPageToken = initialNextPageToken;

  while (nextPageToken && merged.length < FILE_BROWSER_SORT_FETCH_CAP) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const page = await fileService.listFilesPage(
      activeSection,
      searchQuery,
      parentId,
      {
        signal,
        pageSize,
        pageToken: nextPageToken,
      },
    );
    merged = mergeUniqueDriveFiles(merged, page.files);
    nextPageToken = page.nextPageToken;
  }

  return {
    files: merged,
    nextPageToken,
  };
}
