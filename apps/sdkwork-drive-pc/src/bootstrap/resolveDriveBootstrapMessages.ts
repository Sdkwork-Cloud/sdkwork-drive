import en from '../../packages/sdkwork-drive-pc-commons/src/i18n/locales/en/settings';
import zh from '../../packages/sdkwork-drive-pc-commons/src/i18n/locales/zh/settings';

export type DriveBootstrapMessages = {
  bootstrapFailedTitle: string;
  bootstrapFailedDesc: string;
  bootstrapReload: string;
};

function resolveBootstrapLanguage(): 'en' | 'zh' {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const saved = window.localStorage.getItem('sdkwork-ui-language');
  if (saved === 'zh' || saved === 'en') {
    return saved;
  }
  const browserLang = window.navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

export function resolveDriveBootstrapMessages(): DriveBootstrapMessages {
  const locale = resolveBootstrapLanguage() === 'zh' ? zh : en;
  return {
    bootstrapFailedTitle: locale.bootstrapFailedTitle,
    bootstrapFailedDesc: locale.bootstrapFailedDesc,
    bootstrapReload: locale.bootstrapReload,
  };
}
