import { useContext } from 'react';
import { LanguageProviderContext } from 'sdkwork-drive-pc-commons';

export function useTranslation() {
  const context = useContext(LanguageProviderContext);
  if (context) {
    const { t: baseT, language, setLanguage } = context;
    const t = (key: string, params?: Record<string, string | number>) =>
      baseT(`storageProviders.${key}`, params);
    return { t, language, setLanguage };
  }

  return {
    t: (key: string, _params?: Record<string, string | number>) => key,
    language: 'en' as const,
    setLanguage: () => {},
  };
}
