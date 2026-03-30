import type { ViewMode } from '../store/driveStore.helpers.ts';

export interface DriveLoadingLayout {
  statCards: number;
  rows: number;
  variant: ViewMode;
}

export function buildDriveLoadingLayout(viewMode: ViewMode): DriveLoadingLayout {
  if (viewMode === 'list') {
    return {
      statCards: 3,
      rows: 7,
      variant: 'list',
    };
  }

  return {
    statCards: 3,
    rows: 6,
    variant: 'grid',
  };
}
