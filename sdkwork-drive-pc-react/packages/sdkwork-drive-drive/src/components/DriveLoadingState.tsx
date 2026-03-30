import { buildDriveLoadingLayout } from '../utils/loadingPresentation.ts';
import type { ViewMode } from '../store/driveStore.helpers.ts';

export interface DriveLoadingStateProps {
  viewMode: ViewMode;
}

export function DriveLoadingState({ viewMode }: DriveLoadingStateProps) {
  const layout = buildDriveLoadingLayout(viewMode);

  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="h-7 w-40 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="mt-5 h-10 w-72 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="mt-4 h-5 w-full max-w-3xl animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {Array.from({ length: layout.statCards }).map((_, index) => (
            <div
              key={`drive-loading-stat-${index}`}
              className="rounded-[24px] border border-white/60 bg-white/85 p-4 shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900/85"
            >
              <div className="h-4 w-20 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
              <div className="mt-4 h-8 w-24 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
              <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="h-6 w-52 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="mt-4 h-11 w-full animate-pulse rounded-[24px] bg-zinc-200/70 dark:bg-zinc-800/70" />

        {layout.variant === 'list' ? (
          <div className="mt-4 overflow-hidden rounded-[28px] border border-white/60 bg-white/85 dark:border-zinc-800 dark:bg-zinc-900/85">
            <div className="grid grid-cols-[minmax(0,1.8fr)_120px_160px_132px] gap-4 border-b border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`drive-loading-list-header-${index}`}
                  className="h-4 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80"
                />
              ))}
            </div>
            <div className="space-y-1 p-2">
              {Array.from({ length: layout.rows }).map((_, index) => (
                <div
                  key={`drive-loading-list-row-${index}`}
                  className="grid grid-cols-[minmax(0,1.8fr)_120px_160px_132px] gap-4 rounded-[24px] px-3 py-4"
                >
                  <div className="h-12 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
                  <div className="h-5 animate-pulse self-center rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
                  <div className="h-5 animate-pulse self-center rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
                  <div className="h-8 animate-pulse self-center rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: layout.rows }).map((_, index) => (
              <div
                key={`drive-loading-grid-card-${index}`}
                className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900/85"
              >
                <div className="h-32 animate-pulse rounded-[22px] bg-zinc-200/70 dark:bg-zinc-800/70" />
                <div className="mt-5 h-5 w-2/3 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
                <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800/70" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
