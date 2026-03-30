import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { Languages, LogOut, MoonStar, Search, Settings2, SunMedium, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Input } from '@sdkwork/drive-ui';
import { useAppStore, useAuthStore } from '@sdkwork/drive-core';
import {
  buildNextSearch,
  getSearchValue,
  isEditableTarget,
  shouldFocusDriveSearch,
} from './appHeader.utils.ts';

export interface AppHeaderProps {
  authMode?: boolean;
}

export function AppHeader({ authMode = false }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const languagePreference = useAppStore((state) => state.languagePreference);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [searchValue, setSearchValue] = useState(getSearchValue(location.search));
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const deferredSearchValue = useDeferredValue(searchValue);

  const isDriveRoute = location.pathname.startsWith('/drive');

  useEffect(() => {
    setSearchValue(getSearchValue(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!isDriveRoute || authMode) {
      return;
    }

    const currentQuery = getSearchValue(location.search);
    if (deferredSearchValue === currentQuery) {
      return;
    }

    startTransition(() => {
      navigate(
        {
          pathname: location.pathname,
          search: buildNextSearch(location.search, deferredSearchValue),
        },
        { replace: true },
      );
    });
  }, [authMode, deferredSearchValue, isDriveRoute, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isDriveRoute || authMode) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldFocusDriveSearch(event)) {
        return;
      }

      if (isEditableTarget(event.target) && document.activeElement === searchInputRef.current) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, isDriveRoute]);

  async function handleSignOut() {
    await signOut();
    startTransition(() => {
      navigate('/login', { replace: true });
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-4 border-b border-white/60 bg-white/72 px-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/72">
      <div className="min-w-[140px] text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {authMode ? t('common.productName') : t('shell.header.workspace')}
      </div>

      {isDriveRoute && !authMode ? (
        <div className="flex min-w-0 flex-1 items-center">
          <div className="relative w-full max-w-[560px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={searchInputRef}
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && searchValue) {
                  event.preventDefault();
                  setSearchValue('');
                }
              }}
              placeholder={t('shell.header.searchPlaceholder')}
              className="h-11 rounded-2xl border-white/60 bg-white/90 pl-11 pr-24 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  title={t('common.clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <span className="hidden rounded-lg border border-white/60 bg-white/90 px-2 py-1 text-[11px] font-semibold text-zinc-500 shadow-sm lg:inline-flex dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400">
                {t('shell.header.searchShortcut')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(languagePreference === 'zh' ? 'en' : 'zh')}
          title={t('settings.general.language')}
        >
          <Languages className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          title={t('settings.general.themeMode')}
        >
          {themeMode === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>

        {!authMode ? (
          <>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 rounded-[22px] border border-white/60 bg-white/90 px-3 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 font-semibold text-white">
                {user?.initials || 'SD'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {user?.displayName || t('settings.account.guestName')}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user?.email || t('shell.header.operator')}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void handleSignOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
