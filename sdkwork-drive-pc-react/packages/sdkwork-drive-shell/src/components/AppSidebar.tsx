import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@sdkwork/drive-core';
import { APP_SIDEBAR_NAV_ITEMS, resolveSidebarToggleLabelKey } from './appSidebar.utils.ts';

export function AppSidebar() {
  const { t } = useTranslation();
  const collapsed = useAppStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-white/60 bg-white/75 px-3 py-4 backdrop-blur-xl transition-[width] dark:border-zinc-800 dark:bg-zinc-950/75 ${
        collapsed ? 'w-[86px]' : 'w-[238px]'
      }`}
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-primary-600 text-lg font-black text-white shadow-lg shadow-primary-950/20">
            SD
          </div>
          {!collapsed ? (
            <div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {t('common.productName')}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {t('sidebar.workspace')}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          title={t(resolveSidebarToggleLabelKey(collapsed))}
          aria-label={t(resolveSidebarToggleLabelKey(collapsed))}
          className="rounded-2xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-2">
        {APP_SIDEBAR_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            title={collapsed ? t(item.labelKey) : undefined}
            aria-label={t(item.labelKey)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/20'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="h-4 w-4" />
            {!collapsed ? <span>{t(item.labelKey)}</span> : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
