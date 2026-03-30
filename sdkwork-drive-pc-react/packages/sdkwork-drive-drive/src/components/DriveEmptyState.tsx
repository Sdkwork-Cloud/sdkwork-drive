import { Filter, FolderOpen, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@sdkwork/drive-ui';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';
import type { DriveEmptyStateMode } from '../utils/viewState.ts';

export interface DriveEmptyStateProps {
  mode: DriveEmptyStateMode;
  searchQuery: string;
  filterType: FileTypeFilter;
  onClearSearch: () => void;
  onClearFilter: () => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
}

export function DriveEmptyState({
  mode,
  searchQuery,
  filterType,
  onClearSearch,
  onClearFilter,
  onCreateFolder,
  onUpload,
}: DriveEmptyStateProps) {
  const { t } = useTranslation();

  const config = (() => {
    switch (mode) {
      case 'search':
        return {
          icon: Search,
          title: t('drive.empty.searchTitle', { query: searchQuery }),
          description: t('drive.empty.searchDescription'),
          actionLabel: t('drive.empty.clearSearch'),
          onAction: onClearSearch,
        };
      case 'filter':
        return {
          icon: Filter,
          title: t('drive.empty.filterTitle', { filter: t(`drive.filters.${filterType}`) }),
          description: t('drive.empty.filterDescription'),
          actionLabel: t('drive.empty.clearFilter'),
          onAction: onClearFilter,
        };
      case 'trash':
        return {
          icon: Trash2,
          title: t('drive.empty.trashTitle'),
          description: t('drive.empty.trashDescription'),
        };
      default:
        return {
          icon: FolderOpen,
          title: t('drive.empty.title'),
          description: t('drive.empty.description'),
        };
    }
  })();

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-zinc-200 bg-white/70 px-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="rounded-full bg-primary-50 p-4 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
        <config.icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{config.title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-zinc-500 dark:text-zinc-400">{config.description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {config.actionLabel && config.onAction ? (
          <Button variant="outline" onClick={config.onAction}>
            {config.actionLabel}
          </Button>
        ) : null}
        {mode === 'default' && onCreateFolder ? (
          <Button onClick={onCreateFolder}>
            {t('drive.actions.newFolder')}
          </Button>
        ) : null}
        {mode === 'default' && onUpload ? (
          <Button variant="outline" onClick={onUpload}>
            {t('drive.actions.upload')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
