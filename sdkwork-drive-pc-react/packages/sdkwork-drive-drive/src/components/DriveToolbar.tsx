import {
  ArrowDownWideNarrow,
  CloudUpload,
  Filter,
  FolderPlus,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from 'lucide-react';
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
    items,
    refresh,
    searchQuery,
    selectedItems,
    setSort,
    setViewMode,
    sortBy,
    sortDirection,
    uploadFiles,
    viewMode,
  } = useDriveStore();
  const fileCount = items.filter((item) => item.type === 'file').length;
  const folderCount = items.filter((item) => item.type === 'folder').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          {t('drive.toolbar.scope')}
        </div>
        <div className="rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/88 dark:text-zinc-300">
          {t('drive.toolbar.results', { count: items.length })}
        </div>
        <div className="rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/88 dark:text-zinc-300">
          {t('drive.toolbar.breakdown', { files: fileCount, folders: folderCount })}
        </div>
        {selectedItems.length > 0 ? (
          <div className="rounded-full border border-primary-200/80 bg-primary-50/90 px-3 py-1.5 text-xs font-medium text-primary-700 shadow-sm dark:border-primary-500/30 dark:bg-primary-950/30 dark:text-primary-300">
            {t('drive.toolbar.selection', { count: selectedItems.length })}
          </div>
        ) : null}
        {searchQuery ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/88 dark:text-zinc-300">
            <Search className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
            {t('drive.hero.searchChip', { query: searchQuery })}
          </div>
        ) : null}
        {filterType !== 'all' ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/88 dark:text-zinc-300">
            <Filter className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
            {t('drive.hero.filterChip', { filter: t(`drive.filters.${filterType}`) })}
          </div>
        ) : null}
      </div>

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
    </div>
  );
}
