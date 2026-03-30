import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDriveStore } from '../store/driveStore.tsx';
import { buildDriveBreadcrumbs } from '../store/driveStore.helpers.ts';

export function DriveBreadcrumbs() {
  const { t } = useTranslation();
  const { currentPath, navigateTo } = useDriveStore();
  const breadcrumbs = buildDriveBreadcrumbs(currentPath);

  function resolveBreadcrumbLabel(path: string, fallbackLabel: string) {
    if (path === '/') {
      return t('drive.sidebar.myDrive');
    }

    switch (path) {
      case 'virtual://starred':
        return t('drive.sidebar.starred');
      case 'virtual://recent':
        return t('drive.sidebar.recent');
      case 'virtual://trash':
        return t('drive.sidebar.trash');
      default:
        return fallbackLabel;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo(breadcrumb.path)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              index === breadcrumbs.length - 1
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            {resolveBreadcrumbLabel(breadcrumb.path, breadcrumb.label)}
          </button>
          {index < breadcrumbs.length - 1 ? (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
