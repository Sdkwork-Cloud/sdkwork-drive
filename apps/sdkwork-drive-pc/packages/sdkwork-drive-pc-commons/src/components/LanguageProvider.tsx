import React, { createContext, useContext, useState } from 'react';
import en from '../i18n/locales/en';
import zh from '../i18n/locales/zh';
import {
  readPreference,
  writePreference,
  type PreferenceStorage,
} from './preferenceStorage';

export type Language = 'en' | 'zh';

const languages = { en, zh };

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
  preferenceStorage?: PreferenceStorage;
  storageKey?: string;
}

interface LanguageProviderState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LanguageProviderContext = createContext<LanguageProviderState | undefined>(undefined);

export function LanguageProvider({
  children,
  defaultLanguage = 'en',
  preferenceStorage,
  storageKey = 'sdkwork-ui-language',
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = readPreference(preferenceStorage, storageKey);
    if (saved === 'en' || saved === 'zh') return saved;
    // Auto detect from browser language if not set
    if (typeof window !== 'undefined' && window.navigator) {
      const browserLang = window.navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) return 'zh';
    }
    return defaultLanguage;
  });

  const setLanguage = (lang: Language) => {
    writePreference(preferenceStorage, storageKey, lang);
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const localeDict = languages[language] || languages.en;
    const parts = key.split('.');
    let current: any = localeDict;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = current[part];
    }

    if (typeof current !== 'string') {
      // Fallback to English dictionary if key is not found in selected language
      let fallbackCurrent: any = languages.en;
      for (const part of parts) {
        if (fallbackCurrent == null || typeof fallbackCurrent !== 'object') {
          fallbackCurrent = undefined;
          break;
        }
        fallbackCurrent = fallbackCurrent[part];
      }
      if (typeof fallbackCurrent === 'string') {
        current = fallbackCurrent;
      } else {
        return key; // return key as fallback
      }
    }

    let result = current;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }

    return result;
  };

  return (
    <LanguageProviderContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(LanguageProviderContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
