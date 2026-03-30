import { CloudUpload, FolderPlus, HardDrive, History, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@sdkwork/drive-commons';
import { Button } from '@sdkwork/drive-ui';
import { useDriveStore } from '../store/driveStore.tsx';

function SidebarLink({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof HardDrive;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
        active
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/20'
          : 'text-zinc-700 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export interface DriveSidebarProps {
  onCreateFolder: () => void;
}

export function DriveSidebar({ onCreateFolder }: DriveSidebarProps) {
  const { t } = useTranslation();
  const { currentPath, stats, navigateHome, navigateTo, uploadFiles } = useDriveStore();

  const usagePercent = stats?.totalBytes
    ? Math.min(100, Math.round((stats.usedBytes / stats.totalBytes) * 100))
    : 0;

  return (
    <aside className="hidden shrink-0 self-start lg:sticky lg:top-0 lg:flex lg:w-[244px] lg:flex-col lg:gap-4 xl:w-[280px]">
      <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="space-y-3">
          <Button className="w-full justify-start" onClick={onCreateFolder}>
            <FolderPlus className="h-4 w-4" />
            {t('drive.actions.newFolder')}
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => void uploadFiles()}>
            <CloudUpload className="h-4 w-4" />
            {t('drive.actions.upload')}
          </Button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/60 bg-white/85 p-4 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          {t('drive.sidebar.quickAccess')}
        </div>
        <div className="space-y-2">
          <SidebarLink
            active={!currentPath.startsWith('virtual://')}
            icon={HardDrive}
            label={t('drive.sidebar.myDrive')}
            onClick={navigateHome}
          />
          <SidebarLink
            active={currentPath === 'virtual://starred'}
            icon={Star}
            label={t('drive.sidebar.starred')}
            onClick={() => navigateTo('virtual://starred')}
          />
          <SidebarLink
            active={currentPath === 'virtual://recent'}
            icon={History}
            label={t('drive.sidebar.recent')}
            onClick={() => navigateTo('virtual://recent')}
          />
          <SidebarLink
            active={currentPath === 'virtual://trash'}
            icon={Trash2}
            label={t('drive.sidebar.trash')}
            onClick={() => navigateTo('virtual://trash')}
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary-100 p-3 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('drive.storage.title')}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('drive.storage.subtitle')}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{formatBytes(stats?.usedBytes || 0)}</span>
            <span>{formatBytes(stats?.totalBytes || 0)}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-400"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t('drive.storage.usedPercent', { value: usagePercent })}
          </div>
        </div>
      </div>
    </aside>
  );
}
