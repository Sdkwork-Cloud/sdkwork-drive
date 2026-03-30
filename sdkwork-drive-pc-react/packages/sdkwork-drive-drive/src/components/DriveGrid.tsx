import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock3,
  Download,
  Eye,
  FolderOpen,
  Star,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@sdkwork/drive-commons';
import type { DriveItem } from '../entities/drive.entity.ts';
import {
  resolveNextSortState,
  type SortDirection,
  type SortOption,
  type ViewMode,
} from '../store/driveStore.helpers.ts';
import {
  resolveDriveQuickActionTabIndex,
  resolveDriveQuickActions,
  shouldHandleDriveItemKeyboardEvent,
  type DriveQuickAction,
} from '../utils/interaction.ts';
import { FileIcon } from './FileIcon.tsx';

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export interface DriveGridProps {
  items: DriveItem[];
  selection: Set<string>;
  viewMode: ViewMode;
  sortBy: SortOption;
  sortDirection: SortDirection;
  isTrashView: boolean;
  onItemOpen: (item: DriveItem) => void;
  onItemPreview: (item: DriveItem) => void;
  onItemDownload: (item: DriveItem) => void;
  onItemToggleStar: (item: DriveItem) => void;
  onItemRestore: (item: DriveItem) => void;
  onSortChange: (sortBy: SortOption, sortDirection: SortDirection) => void;
  onItemContextMenu: (event: ReactMouseEvent, item: DriveItem) => void;
  onItemSelect: (id: string, multi: boolean, range?: boolean) => void;
  onBackgroundClick: () => void;
  onBackgroundContextMenu: (event: ReactMouseEvent) => void;
}

export function DriveGrid({
  items,
  selection,
  viewMode,
  sortBy,
  sortDirection,
  isTrashView,
  onItemOpen,
  onItemPreview,
  onItemDownload,
  onItemToggleStar,
  onItemRestore,
  onSortChange,
  onItemContextMenu,
  onItemSelect,
  onBackgroundClick,
  onBackgroundContextMenu,
}: DriveGridProps) {
  const { t } = useTranslation();
  const listColumns: Array<{ sortKey: SortOption; label: string }> = [
    { sortKey: 'name', label: t('drive.table.name') },
    { sortKey: 'size', label: t('drive.table.size') },
    { sortKey: 'date', label: t('drive.table.updated') },
  ];

  function handleSortHeaderClick(nextSortBy: SortOption) {
    const nextSort = resolveNextSortState(sortBy, sortDirection, nextSortBy);
    onSortChange(nextSort.sortBy, nextSort.sortDirection);
  }

  function renderSortIcon(columnSortBy: SortOption) {
    if (sortBy !== columnSortBy) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3.5 w-3.5" />;
    }

    return <ArrowDown className="h-3.5 w-3.5" />;
  }

  function handleItemKeyDown(event: ReactKeyboardEvent<HTMLElement>, item: DriveItem) {
    if (!shouldHandleDriveItemKeyboardEvent({
      target: event.target,
      currentTarget: event.currentTarget,
    })) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (item.type === 'folder') {
        onItemOpen(item);
        return;
      }

      onItemPreview(item);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onItemSelect(item.id, event.metaKey || event.ctrlKey, event.shiftKey);
    }
  }

  function runQuickAction(action: DriveQuickAction, item: DriveItem) {
    switch (action) {
      case 'open':
        onItemOpen(item);
        break;
      case 'preview':
        onItemPreview(item);
        break;
      case 'download':
        onItemDownload(item);
        break;
      case 'toggleStar':
        onItemToggleStar(item);
        break;
      case 'restore':
        onItemRestore(item);
        break;
    }
  }

  function getQuickActionLabel(action: DriveQuickAction, item: DriveItem) {
    switch (action) {
      case 'open':
        return t('drive.actions.open');
      case 'preview':
        return t('drive.actions.preview');
      case 'download':
        return t('drive.actions.download');
      case 'toggleStar':
        return item.isStarred ? t('drive.actions.removeStar') : t('drive.actions.addStar');
      case 'restore':
        return t('drive.actions.restore');
    }
  }

  function renderQuickActionIcon(action: DriveQuickAction, item: DriveItem) {
    switch (action) {
      case 'open':
        return <FolderOpen className="h-3.5 w-3.5" />;
      case 'preview':
        return <Eye className="h-3.5 w-3.5" />;
      case 'download':
        return <Download className="h-3.5 w-3.5" />;
      case 'toggleStar':
        return (
          <Star
            className={`h-3.5 w-3.5 ${item.isStarred ? 'fill-current text-amber-400' : ''}`}
          />
        );
      case 'restore':
        return <Undo2 className="h-3.5 w-3.5" />;
    }
  }

  function renderQuickActions(item: DriveItem, alwaysVisible = false) {
    const actions = resolveDriveQuickActions({
      item,
      isTrashView,
    });

    return (
      <div
        className={`flex items-center gap-1 transition-opacity ${
          alwaysVisible
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
        }`}
      >
        {actions.map((action) => (
          <button
            key={`${item.id}-${action}`}
            type="button"
            tabIndex={resolveDriveQuickActionTabIndex(alwaysVisible)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              runQuickAction(action, item);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                event.stopPropagation();
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/92 text-zinc-500 shadow-sm transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-zinc-700 dark:bg-zinc-900/92 dark:text-zinc-300 dark:hover:border-primary-500 dark:hover:text-primary-300"
            title={getQuickActionLabel(action, item)}
            aria-label={getQuickActionLabel(action, item)}
          >
            {renderQuickActionIcon(action, item)}
          </button>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-zinc-200 bg-white/70 px-8 text-center dark:border-zinc-800 dark:bg-zinc-900/60"
        onClick={onBackgroundClick}
        onContextMenu={onBackgroundContextMenu}
      >
        <div className="rounded-full bg-primary-50 p-4 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
          <FileIcon
            item={{
              id: 'empty',
              parentId: null,
              name: 'empty',
              type: 'folder',
              size: 0,
              updatedAt: Date.now(),
              createdAt: Date.now(),
            }}
            className="h-8 w-8"
          />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t('drive.empty.title')}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          {t('drive.empty.description')}
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="grid grid-cols-[minmax(0,1.8fr)_120px_160px_132px] gap-4 border-b border-zinc-200/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:border-zinc-800">
          {listColumns.map((column) => {
            const isActive = sortBy === column.sortKey;
            return (
              <button
                key={column.sortKey}
                type="button"
                onClick={() => handleSortHeaderClick(column.sortKey)}
                className={`flex items-center gap-2 text-left transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
                aria-pressed={isActive}
              >
                <span>{column.label}</span>
                {renderSortIcon(column.sortKey)}
              </button>
            );
          })}
          <span />
        </div>
        <div
          className="min-h-[360px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              onBackgroundClick();
            }
          }}
          onContextMenu={(event) => {
            if (event.target === event.currentTarget) {
              onBackgroundContextMenu(event);
            }
          }}
        >
          {items.map((item) => {
            const selected = selection.has(item.id);
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={(event) => onItemSelect(item.id, event.metaKey || event.ctrlKey, event.shiftKey)}
                onDoubleClick={() => (item.type === 'folder' ? onItemOpen(item) : onItemPreview(item))}
                onContextMenu={(event) => onItemContextMenu(event, item)}
                onKeyDown={(event) => handleItemKeyDown(event, item)}
                className={`group grid w-full cursor-pointer grid-cols-[minmax(0,1.8fr)_120px_160px_132px] gap-4 px-5 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                  selected
                    ? 'bg-primary-50 dark:bg-primary-950/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <FileIcon item={item} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {item.path}
                    </div>
                  </div>
                </div>
                <div className="self-center text-sm text-zinc-500 dark:text-zinc-400">
                  {item.type === 'folder' ? '--' : formatBytes(item.size)}
                </div>
                <div className="self-center text-sm text-zinc-500 dark:text-zinc-400">
                  {formatUpdatedAt(item.updatedAt)}
                </div>
                <div className="flex items-center justify-end">
                  {renderQuickActions(item, selected)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[360px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onBackgroundClick();
        }
      }}
      onContextMenu={(event) => {
        if (event.target === event.currentTarget) {
          onBackgroundContextMenu(event);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const selected = selection.has(item.id);
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={(event) => onItemSelect(item.id, event.metaKey || event.ctrlKey, event.shiftKey)}
              onDoubleClick={() => (item.type === 'folder' ? onItemOpen(item) : onItemPreview(item))}
              onContextMenu={(event) => onItemContextMenu(event, item)}
              onKeyDown={(event) => handleItemKeyDown(event, item)}
              className={`group overflow-hidden rounded-[28px] border bg-white/85 p-5 text-left shadow-xl shadow-zinc-950/5 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:bg-zinc-900/85 ${
                selected
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-white/60 hover:border-primary-300 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-[22px] bg-zinc-100 p-4 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <FileIcon item={item} className="h-7 w-7" />
                </div>
                {item.isStarred ? <Star className="h-4 w-4 fill-current text-amber-400" /> : null}
              </div>

              <div className="mt-5">
                <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatUpdatedAt(item.updatedAt)}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{item.type === 'folder' ? t('drive.item.folder') : t('drive.item.file')}</span>
                <span>{item.type === 'folder' ? '--' : formatBytes(item.size)}</span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                  {t('drive.table.updated')}
                </div>
                {renderQuickActions(item, selected)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
