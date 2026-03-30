import { useEffect } from 'react';
import { useAppStore } from '@sdkwork/drive-core';

function resolveDarkMode(themeMode: 'light' | 'dark' | 'system') {
  if (themeMode === 'dark') {
    return true;
  }
  if (themeMode === 'light') {
    return false;
  }

  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeManager() {
  const themeMode = useAppStore((state) => state.themeMode);
  const themeColor = useAppStore((state) => state.themeColor);

  useEffect(() => {
    const isDark = resolveDarkMode(themeMode);
    const root = document.documentElement;

    root.classList.toggle('dark', isDark);
    root.dataset.theme = themeColor;
  }, [themeColor, themeMode]);

  useEffect(() => {
    if (themeMode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  return null;
}
