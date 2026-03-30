import { ArrowDownWideNarrow, CloudUpload, FolderPlus, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sdkwork/drive-ui';
import { useDriveStore } from '../store/driveStore.tsx';
import {
  resolveNextSortState,
  type FileTypeFilter,
  type SortOption,
} from '../store/driveStore.helpers.ts';

const SORT_OPTIONS: SortOption[] = ['name', 'date', 'size'];
const FILTER_OPTIONS: FileTypeFilter[] = [
  'all',
  'document',
  'sheet',
  'presentation',
  'image',
  'video',
  'audio',
  'archive',
  'code',
  'font',
  '3d',
];

export interface DriveToolbarProps {
  onCreateFolder: () => void;
}

export function DriveToolbar({ onCreateFolder }: DriveToolbarProps) {
  const { t } = useTranslation();
  const {
    filterType,
    setFilterType,
    isVirtualView,
    refresh,
    setSort,
    setViewMode,
    sortBy,
    sortDirection,
    uploadFiles,
    viewMode,
  } = useDriveStore();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        {!isVirtualView ? (
          <>
            <Button size="sm" onClick={onCreateFolder}>
              <FolderPlus className="h-4 w-4" />
              {t('drive.actions.newFolder')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void uploadFiles()}>
              <CloudUpload className="h-4 w-4" />
              {t('drive.actions.upload')}
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
          {t('drive.actions.refresh')}
        </Button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select
          value={sortBy}
          onValueChange={(value) => {
            const nextSort = resolveNextSortState(sortBy, sortDirection, value as SortOption);
            setSort(nextSort.sortBy, nextSort.sortDirection);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <ArrowDownWideNarrow className="mr-2 h-4 w-4 text-zinc-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`drive.sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortDirection}
          onValueChange={(value) => setSort(sortBy, value as 'asc' | 'desc')}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">{t('drive.sort.asc')}</SelectItem>
            <SelectItem value="desc">{t('drive.sort.desc')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as FileTypeFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`drive.filters.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-xl p-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-600 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-xl p-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
