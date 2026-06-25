import type { DriveSection } from '../pages/DrivePage';

export function supportsServerSideFileBrowserSort(
  section: DriveSection,
  searchQuery: string,
  parentId: string | null,
): boolean {
  if (searchQuery.trim().length > 0) {
    return false;
  }
  if (section === 'computers') {
    return false;
  }
  if (
    !parentId &&
    (section === 'recent' || section === 'starred' || section === 'shared' || section === 'trash')
  ) {
    return false;
  }
  return true;
}
