import { HardDrive, Layers3, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@sdkwork/drive-commons';
import { useDriveStore } from '../store/driveStore.tsx';

export function DriveStatCards() {
  const { t } = useTranslation();
  const { items, searchQuery, stats } = useDriveStore();

  const cards = [
    {
      key: 'storage',
      icon: HardDrive,
      label: t('drive.hero.storage'),
      value: formatBytes(stats?.usedBytes || 0),
      hint: t('drive.hero.ofTotal', { value: formatBytes(stats?.totalBytes || 0) }),
    },
    {
      key: 'items',
      icon: Layers3,
      label: t('drive.hero.items'),
      value: `${items.length}`,
      hint: t('drive.hero.fileCount'),
    },
    {
      key: 'search',
      icon: Search,
      label: t('drive.hero.search'),
      value: searchQuery ? `"${searchQuery}"` : t('drive.hero.noSearch'),
      hint: searchQuery ? t('drive.hero.searchActive') : t('drive.hero.searchIdle'),
    },
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
