import { useEffect } from 'react';
import { changeAppLanguage, ensureI18n } from '@sdkwork/drive-i18n';
import { useAppStore } from '@sdkwork/drive-core';

export function LanguageManager() {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    void ensureI18n(language);
  }, [language]);

  useEffect(() => {
    void changeAppLanguage(language);
  }, [language]);

  return null;
}
