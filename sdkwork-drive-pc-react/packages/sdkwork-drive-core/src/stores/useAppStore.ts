import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  defaultLanguage,
  normalizeLanguage,
  resolveInitialLanguage,
  type SupportedLanguage,
} from '@sdkwork/drive-i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'lobster' | 'tech-blue' | 'green-tech' | 'zinc' | 'violet' | 'rose';
export type Language = SupportedLanguage;
export type LanguagePreference = Language | 'system';

interface AppState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  language: Language;
  languagePreference: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
}

function resolveLanguageFromPreference(preference: LanguagePreference): Language {
  if (preference === 'system') {
    return resolveInitialLanguage();
  }

  return normalizeLanguage(preference);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
      themeColor: 'tech-blue',
      setThemeColor: (themeColor) => set({ themeColor }),
      languagePreference: 'system',
      language: resolveInitialLanguage(),
      setLanguage: (languagePreference) => {
        const nextPreference = languagePreference === 'system'
          ? 'system'
          : normalizeLanguage(languagePreference);
        set({
          languagePreference: nextPreference,
          language: resolveLanguageFromPreference(nextPreference),
        });
      },
    }),
    {
      name: 'sdkwork-drive-app-storage',
      merge: (persistedState, currentState) => {
        const nextState = (persistedState as Partial<AppState>) || {};
        const nextPreference = nextState.languagePreference ?? 'system';
        return {
          ...currentState,
          ...nextState,
          languagePreference: nextPreference,
          language: resolveLanguageFromPreference(nextPreference),
          themeColor: nextState.themeColor ?? 'tech-blue',
          themeMode: nextState.themeMode ?? 'system',
        };
      },
    },
  ),
);

export const appDefaultLanguage = defaultLanguage;
