import {
  CloudUpload,
  Download,
  Eye,
  FolderPlus,
  HardDrive,
  Search,
  Sparkles,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@sdkwork/drive-commons';
import { Button } from '@sdkwork/drive-ui';
import type { DriveItem } from '../entities/drive.entity.ts';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';
import { resolveDriveItemKindLabel } from '../utils/driveItemPresentation.ts';
import type {
  DriveDetailsActionId,
  DriveDetailsFocusReason,
  DriveDetailsPanelModel,
  DriveDetailsRecommendation,
} from '../utils/workspacePresentation.ts';
import { DriveItemVisual } from './DriveItemVisual.tsx';
import { FileIcon } from './FileIcon.tsx';

export interface DriveDetailsPanelProps {
  model: DriveDetailsPanelModel;
  items: DriveItem[];
  selectedItems: DriveItem[];
  searchQuery: string;
  filterType: FileTypeFilter;
  onCreateFolder: () => void;
  onUpload: () => void;
  onClearSearch: () => void;
  onClearFilter: () => void;
  onClearSelection: () => void;
  onOpenItem: (item: DriveItem) => void;
  onPreviewItem: (item: DriveItem) => void;
  onDownloadItems: (ids: string[]) => void;
  onToggleStars: (ids: string[], status: boolean) => void;
  onDeleteItems: (ids: string[]) => void;
  onRestoreItems: (ids: string[]) => void;
  onEmptyTrash: () => void;
}

function getViewLabelKey(viewKind: DriveDetailsPanelModel['viewKind']) {
  switch (viewKind) {
    case 'starred':
      return 'drive.sidebar.starred';
    case 'recent':
      return 'drive.sidebar.recent';
    case 'trash':
      return 'drive.sidebar.trash';
    default:
      return 'drive.sidebar.myDrive';
  }
}

function getViewHintKey(viewKind: DriveDetailsPanelModel['viewKind']) {
  switch (viewKind) {
    case 'starred':
      return 'drive.details.hints.starred';
    case 'recent':
      return 'drive.details.hints.recent';
    case 'trash':
      return 'drive.details.hints.trash';
    default:
      return 'drive.details.hints.drive';
  }
}

function PanelCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/88 p-5 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/88">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary-50 p-3 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </div>
      <div className="max-w-[12rem] text-right text-sm text-zinc-600 dark:text-zinc-300">
        {value}
      </div>
    </div>
  );
}

function ActionButtonGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function getStorageStateKey(usagePercent: number) {
  return usagePercent >= 80 ? 'drive.details.storageStates.attention' : 'drive.details.storageStates.healthy';
}

function getRecommendationToneClass(tone: DriveDetailsRecommendation['tone']) {
  switch (tone) {
    case 'warning':
      return 'border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-100';
    case 'primary':
      return 'border-primary-200/80 bg-primary-50/90 text-primary-950 dark:border-primary-500/30 dark:bg-primary-950/30 dark:text-primary-50';
    default:
      return 'border-zinc-200/80 bg-zinc-50/90 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100';
  }
}

function getFocusReasonLabelKey(reason: DriveDetailsFocusReason) {
  switch (reason) {
    case 'shared':
      return 'drive.details.focusReasons.shared';
    case 'starred':
      return 'drive.details.focusReasons.starred';
    case 'selected':
      return 'drive.details.focusReasons.selected';
    case 'trash':
      return 'drive.details.focusReasons.trash';
    default:
      return 'drive.details.focusReasons.recent';
  }
}

export function DriveDetailsPanel({
  model,
  items,
  selectedItems,
  searchQuery,
  filterType,
  onCreateFolder,
  onUpload,
  onClearSearch,
  onClearFilter,
  onClearSelection,
  onOpenItem,
  onPreviewItem,
  onDownloadItems,
  onToggleStars,
  onDeleteItems,
  onRestoreItems,
  onEmptyTrash,
}: DriveDetailsPanelProps) {
  const { t } = useTranslation();
  const interactionItems = [...selectedItems, ...items];

  function renderRecommendationAction(actionId: DriveDetailsActionId | null) {
    if (!actionId) {
      return null;
    }

    switch (actionId) {
      case 'clearSearch':
        return (
          <Button size="sm" variant="secondary" onClick={onClearSearch}>
            <Search className="h-4 w-4" />
            {t('drive.empty.clearSearch')}
          </Button>
        );
      case 'clearFilter':
        return (
          <Button size="sm" variant="secondary" onClick={onClearFilter}>
            {t('drive.empty.clearFilter')}
          </Button>
        );
      case 'emptyTrash':
        return (
          <Button size="sm" variant="secondary" onClick={onEmptyTrash}>
            <Trash2 className="h-4 w-4" />
            {t('drive.actions.emptyTrash')}
          </Button>
        );
      case 'upload':
        return (
          <Button size="sm" variant="secondary" onClick={onUpload}>
            <CloudUpload className="h-4 w-4" />
            {t('drive.actions.upload')}
          </Button>
        );
      case 'createFolder':
        return (
          <Button size="sm" variant="secondary" onClick={onCreateFolder}>
            <FolderPlus className="h-4 w-4" />
            {t('drive.actions.newFolder')}
          </Button>
        );
    }
  }

  function renderFocusList(
    focusItems: Array<{ id: string; name: string; path: string; type: DriveItem['type']; reason: DriveDetailsFocusReason }>,
    title: string,
  ) {
    if (focusItems.length === 0) {
      return null;
    }

    return (
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {title}
        </div>
        <div className="space-y-2">
          {focusItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const target = interactionItems.find((candidate) => candidate.id === item.id);
                if (!target) {
                  return;
                }

                if (item.type === 'folder') {
                  onOpenItem(target);
                  return;
                }

                onPreviewItem(target);
              }}
              className="flex w-full items-center gap-3 rounded-[22px] border border-zinc-200/70 bg-zinc-50/90 p-3 text-left transition-colors hover:border-primary-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-primary-500/40 dark:hover:bg-zinc-900"
            >
              <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-zinc-900">
                <FileIcon item={{ ...item, parentId: null, size: 0, updatedAt: 0, createdAt: 0 }} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.name}
                </div>
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.path}</div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                {t(getFocusReasonLabelKey(item.reason))}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (model.mode === 'item') {
    const { item } = model;
    const itemIds = [item.id];

    return (
      <aside className="hidden shrink-0 self-start xl:sticky xl:top-0 xl:flex xl:w-[320px] xl:flex-col xl:gap-4">
        <PanelCard title={t('drive.details.itemTitle')} icon={Sparkles}>
          <div className="rounded-[24px] border border-zinc-200/70 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <DriveItemVisual item={item} variant="card" />
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-[24px] bg-zinc-100 p-4 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <FileIcon item={item} className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {item.name}
              </div>
              <div className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {item.path || '/'}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
                  {resolveDriveItemKindLabel(item)}
                </span>
                {item.isStarred ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {t('drive.preview.badges.starred')}
                  </span>
                ) : null}
                {item.isShared ? (
                  <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                    {t('drive.preview.badges.shared')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {t('drive.details.quickActions')}
            </div>
            <ActionButtonGroup>
              {item.type === 'folder' ? (
                <Button size="sm" variant="outline" onClick={() => onOpenItem(item)}>
                  <Sparkles className="h-4 w-4" />
                  {t('drive.actions.open')}
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => onPreviewItem(item)}>
                    <Eye className="h-4 w-4" />
                    {t('drive.actions.preview')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDownloadItems(itemIds)}>
                    <Download className="h-4 w-4" />
                    {t('drive.actions.download')}
                  </Button>
                </>
              )}
              {model.viewKind === 'trash' ? (
                <Button size="sm" variant="outline" onClick={() => onRestoreItems(itemIds)}>
                  <Undo2 className="h-4 w-4" />
                  {t('drive.actions.restore')}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleStars(itemIds, !item.isStarred)}
                  >
                    <Star className="h-4 w-4" />
                    {item.isStarred ? t('drive.actions.removeStar') : t('drive.actions.addStar')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDeleteItems(itemIds)}>
                    <Trash2 className="h-4 w-4" />
                    {t('drive.actions.moveToTrash')}
                  </Button>
                </>
              )}
            </ActionButtonGroup>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {t('drive.preview.detailsTitle')}
            </div>
            <div className="space-y-3">
              {model.facts.map((fact) => (
                <FactRow
                  key={fact.id}
                  label={t(`drive.preview.fields.${fact.id}`)}
                  value={fact.value}
                />
              ))}
            </div>
          </div>
        </PanelCard>
      </aside>
    );
  }

  if (model.mode === 'selection') {
    const nextStarStatus = selectedItems.some((item) => !item.isStarred);
    const selectedIds = selectedItems.map((item) => item.id);

    return (
      <aside className="hidden shrink-0 self-start xl:sticky xl:top-0 xl:flex xl:w-[320px] xl:flex-col xl:gap-4">
        <PanelCard title={t('drive.details.selectionTitle', { count: model.selectedCount })} icon={Sparkles}>
          <div className={`rounded-[24px] border px-4 py-4 ${getRecommendationToneClass(model.recommendation.tone)}`}>
            <div className="text-sm font-semibold">{t(model.recommendation.titleKey)}</div>
            <p className="mt-2 text-sm leading-6 opacity-90">{t(model.recommendation.descriptionKey)}</p>
          </div>

          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {t('drive.details.selectionDescription')}
          </p>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[22px] bg-zinc-50 px-4 py-3 dark:bg-zinc-800/80">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {t('drive.details.labels.files')}
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {model.fileCount}
              </div>
            </div>
            <div className="rounded-[22px] bg-zinc-50 px-4 py-3 dark:bg-zinc-800/80">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {t('drive.details.labels.folders')}
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {model.folderCount}
              </div>
            </div>
            <div className="rounded-[22px] bg-zinc-50 px-4 py-3 dark:bg-zinc-800/80">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {t('drive.details.labels.selection')}
              </div>
              <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {formatBytes(model.selectedTotalBytes)}
              </div>
            </div>
          </div>

          {renderFocusList(model.focusItems, t('drive.details.selectionPreviewTitle'))}
          {selectedItems.length > model.focusItems.length ? (
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('drive.details.focusMore', { count: selectedItems.length - model.focusItems.length })}
            </div>
          ) : null}

          <ActionButtonGroup>
            {model.viewKind === 'trash' ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onRestoreItems(selectedIds)}>
                  <Undo2 className="h-4 w-4" />
                  {t('drive.actions.restore')}
                </Button>
                <Button size="sm" variant="ghost" onClick={onEmptyTrash}>
                  <Trash2 className="h-4 w-4" />
                  {t('drive.actions.emptyTrash')}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => onDownloadItems(selectedIds)}>
                  <Download className="h-4 w-4" />
                  {t('drive.actions.download')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleStars(selectedIds, nextStarStatus)}
                >
                  <Star className="h-4 w-4" />
                  {nextStarStatus ? t('drive.actions.addStar') : t('drive.actions.removeStar')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDeleteItems(selectedIds)}>
                  <Trash2 className="h-4 w-4" />
                  {t('drive.actions.moveToTrash')}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onClearSelection}>
              {t('drive.actions.clearSelection')}
            </Button>
          </ActionButtonGroup>
        </PanelCard>
      </aside>
    );
  }

  return (
    <aside className="hidden shrink-0 self-start xl:sticky xl:top-0 xl:flex xl:w-[320px] xl:flex-col xl:gap-4">
      <PanelCard title={t('drive.details.overviewTitle')} icon={HardDrive}>
        <div className="rounded-[24px] border border-zinc-200/70 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {t('drive.details.storageHealth')}
              </div>
              <div className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {t(getStorageStateKey(model.usagePercent))}
              </div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
              {t('drive.storage.usedPercent', { value: model.usagePercent })}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${model.usagePercent >= 80 ? 'bg-amber-500' : 'bg-primary-600'}`}
              style={{ width: `${Math.max(4, model.usagePercent)}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {t('drive.details.storageValue', {
              used: formatBytes(model.usedBytes),
              total: formatBytes(model.totalBytes),
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {t('drive.details.labels.view')}
          </div>
          <div className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {t(getViewLabelKey(model.viewKind))}
          </div>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {t(getViewHintKey(model.viewKind))}
          </p>
        </div>

        <div className={`rounded-[24px] border px-4 py-4 ${getRecommendationToneClass(model.recommendation.tone)}`}>
          <div className="text-sm font-semibold">{t(model.recommendation.titleKey)}</div>
          <p className="mt-2 text-sm leading-6 opacity-90">{t(model.recommendation.descriptionKey)}</p>
          {model.recommendation.actionId ? (
            <div className="mt-4">{renderRecommendationAction(model.recommendation.actionId)}</div>
          ) : null}
        </div>

        <div className="space-y-3">
          <FactRow label={t('drive.details.labels.results')} value={String(model.resultCount)} />
          <FactRow
            label={t('drive.details.labels.breakdown')}
            value={t('drive.hero.breakdownChip', {
              files: model.fileCount,
              folders: model.folderCount,
            })}
          />
          <FactRow
            label={t('drive.details.labels.storage')}
            value={t('drive.details.storageValue', {
              used: formatBytes(model.usedBytes),
              total: formatBytes(model.totalBytes),
            })}
          />
          <FactRow
            label={t('drive.details.labels.usage')}
            value={t('drive.storage.usedPercent', { value: model.usagePercent })}
          />
          <FactRow
            label={t('drive.details.labels.search')}
            value={
              model.hasActiveSearch
                ? t('drive.hero.searchChip', { query: searchQuery })
                : t('drive.details.none')
            }
          />
          <FactRow
            label={t('drive.details.labels.filter')}
            value={
              model.hasActiveFilter
                ? t('drive.hero.filterChip', { filter: t(`drive.filters.${filterType}`) })
                : t('drive.details.none')
            }
          />
        </div>

        {renderFocusList(model.focusItems, t('drive.details.focusTitle'))}

        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {t('drive.details.quickActions')}
          </div>
          <ActionButtonGroup>
            {model.hasActiveSearch ? (
              <Button size="sm" variant="outline" onClick={onClearSearch}>
                <Search className="h-4 w-4" />
                {t('drive.empty.clearSearch')}
              </Button>
            ) : null}
            {model.hasActiveFilter ? (
              <Button size="sm" variant="outline" onClick={onClearFilter}>
                {t('drive.empty.clearFilter')}
              </Button>
            ) : null}
            {model.viewKind === 'trash' ? (
              <Button size="sm" variant="ghost" onClick={onEmptyTrash}>
                <Trash2 className="h-4 w-4" />
                {t('drive.actions.emptyTrash')}
              </Button>
            ) : model.canCreateContent ? (
              <>
                <Button size="sm" variant="outline" onClick={onCreateFolder}>
                  <FolderPlus className="h-4 w-4" />
                  {t('drive.actions.newFolder')}
                </Button>
                <Button size="sm" variant="ghost" onClick={onUpload}>
                  <CloudUpload className="h-4 w-4" />
                  {t('drive.actions.upload')}
                </Button>
              </>
            ) : null}
          </ActionButtonGroup>
        </div>
      </PanelCard>
    </aside>
  );
}
