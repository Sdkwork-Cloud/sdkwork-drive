import type { ReactNode } from 'react';
import { Clock3, Filter, Search, ShieldCheck, Sparkles, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@sdkwork/drive-ui';
import type { FileTypeFilter } from '../store/driveStore.helpers.ts';
import type { DriveWorkspaceSummary } from '../utils/workspacePresentation.ts';
import { DriveStatCards } from './DriveStatCards.tsx';

export interface DriveWorkspaceHeroProps {
  summary: DriveWorkspaceSummary;
  searchQuery: string;
  filterType: FileTypeFilter;
  isTrashView: boolean;
  onNavigateUp: () => void;
  onSelectAll: () => void;
  onEmptyTrash: () => void;
}

function getViewPresentation(viewKind: DriveWorkspaceSummary['viewKind']) {
  switch (viewKind) {
    case 'starred':
      return {
        badgeKey: 'drive.hero.views.starred.badge',
        titleKey: 'drive.hero.views.starred.title',
        descriptionKey: 'drive.hero.views.starred.description',
        icon: Star,
      };
    case 'recent':
      return {
        badgeKey: 'drive.hero.views.recent.badge',
        titleKey: 'drive.hero.views.recent.title',
        descriptionKey: 'drive.hero.views.recent.description',
        icon: Clock3,
      };
    case 'trash':
      return {
        badgeKey: 'drive.hero.views.trash.badge',
        titleKey: 'drive.hero.views.trash.title',
        descriptionKey: 'drive.hero.views.trash.description',
        icon: ShieldCheck,
      };
    default:
      return {
        badgeKey: 'drive.hero.views.drive.badge',
        titleKey: 'drive.hero.views.drive.title',
        descriptionKey: 'drive.hero.views.drive.description',
        icon: Sparkles,
      };
  }
}

function HeroChip({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/88 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/88 dark:text-zinc-300">
      {children}
    </div>
  );
}

export function DriveWorkspaceHero({
  summary,
  searchQuery,
  filterType,
  isTrashView,
  onNavigateUp,
  onSelectAll,
  onEmptyTrash,
}: DriveWorkspaceHeroProps) {
  const { t } = useTranslation();
  const presentation = getViewPresentation(summary.viewKind);
  const Icon = presentation.icon;

  return (
    <div className="rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,249,255,0.92))] p-6 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.92),rgba(15,23,42,0.92))]">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200/80 bg-primary-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-950/40 dark:text-primary-300">
            <Icon className="h-3.5 w-3.5" />
            {t(presentation.badgeKey)}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
            {t(presentation.titleKey)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {t(presentation.descriptionKey)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <HeroChip>{t('drive.hero.resultsChip', { count: summary.resultCount })}</HeroChip>
            <HeroChip>
              {t('drive.hero.breakdownChip', {
                files: summary.fileCount,
                folders: summary.folderCount,
              })}
            </HeroChip>
            {summary.hasActiveSearch ? (
              <HeroChip>
                <Search className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
                {t('drive.hero.searchChip', { query: searchQuery })}
              </HeroChip>
            ) : null}
            {summary.hasActiveFilter ? (
              <HeroChip>
                <Filter className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
                {t('drive.hero.filterChip', { filter: t(`drive.filters.${filterType}`) })}
              </HeroChip>
            ) : null}
            {summary.selectedCount > 0 ? (
              <HeroChip>
                <Trash2 className="h-3.5 w-3.5 text-primary-600 dark:text-primary-300" />
                {t('drive.hero.selectionChip', { count: summary.selectedCount })}
              </HeroChip>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isTrashView ? (
            <Button variant="outline" onClick={onEmptyTrash}>
              <Trash2 className="h-4 w-4" />
              {t('drive.actions.emptyTrash')}
            </Button>
          ) : (
            <Button variant="outline" onClick={onNavigateUp}>
              {t('drive.actions.up')}
            </Button>
          )}
          <Button variant="ghost" onClick={onSelectAll}>
            {t('drive.actions.selectAll')}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <DriveStatCards
          summary={summary}
          searchQuery={searchQuery}
          filterType={filterType}
        />
      </div>
    </div>
  );
}
