import { Filter, HardDrive, Layers3, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@sdkwork/drive-commons';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';
import type { DriveWorkspaceSummary } from '../utils/workspacePresentation.ts';

export interface DriveStatCardsProps {
  summary: DriveWorkspaceSummary;
  searchQuery: string;
  filterType: FileTypeFilter;
}

export function DriveStatCards({
  summary,
  searchQuery,
  filterType,
}: DriveStatCardsProps) {
  const { t } = useTranslation();
  const focusCard = summary.selectedCount > 0
    ? {
        icon: Sparkles,
        label: t('drive.hero.focus'),
        value: t('drive.hero.selectionChip', { count: summary.selectedCount }),
        hint: t('drive.selection.totalSize', {
          size: formatBytes(summary.selectedTotalBytes),
        }),
      }
    : summary.hasActiveSearch
      ? {
          icon: Search,
          label: t('drive.hero.search'),
          value: `"${searchQuery}"`,
          hint: t('drive.hero.searchActive'),
        }
      : summary.hasActiveFilter
        ? {
            icon: Filter,
            label: t('drive.hero.focus'),
            value: t(`drive.filters.${filterType}`),
            hint: t('drive.hero.filterActive'),
          }
        : {
            icon: Sparkles,
            label: t('drive.hero.focus'),
            value: t(`drive.hero.views.${summary.viewKind}.short`),
            hint: t(`drive.hero.views.${summary.viewKind}.hint`),
          };

  const cards = [
    {
      key: 'storage',
      icon: HardDrive,
      label: t('drive.hero.storage'),
      value: formatBytes(summary.usedBytes),
      hint: t('drive.hero.ofTotal', { value: formatBytes(summary.totalBytes) }),
    },
    {
      key: 'items',
      icon: Layers3,
      label: t('drive.hero.items'),
      value: `${summary.resultCount}`,
      hint: t('drive.hero.breakdownChip', {
        files: summary.fileCount,
        folders: summary.folderCount,
      }),
    },
    { key: 'focus', ...focusCard },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-[24px] border border-white/60 bg-white/85 p-4 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary-50 p-3 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
              <card.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                {card.label}
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {card.value}
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{card.hint}</div>
        </div>
      ))}
    </div>
  );
}
