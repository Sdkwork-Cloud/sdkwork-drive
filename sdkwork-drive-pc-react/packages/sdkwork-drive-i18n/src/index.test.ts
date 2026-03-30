import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };
import {
  APP_STORE_STORAGE_KEY,
  DEFAULT_LANGUAGE,
  I18N_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  detectRequestLanguage,
  ensureI18n,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  formatTime,
  getAppStoreLanguageFromSnapshot,
  localizeValue,
  localizedText,
  normalizeLanguage,
  resolveLocalizedText,
  translationResources,
} from './index.ts';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, '../../..');
const packagesRoot = join(workspaceRoot, 'packages');
const approvedLocaleDirectory = join(packagesRoot, 'sdkwork-drive-i18n', 'src', 'locales');

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(nestedValue, nextPrefix);
  });
}

function collectWorkspaceFiles(directory: string, results: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const nextPath = join(directory, entry);
    const stats = statSync(nextPath);

    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue;
      }

      collectWorkspaceFiles(nextPath, results);
      continue;
    }

    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].includes(extname(nextPath))) {
      results.push(nextPath);
    }
  }

  return results;
}

function collectTranslationUsageKeys() {
  const pattern = /\bt\(\s*['"]([^'"]+)['"]/g;
  const files = collectWorkspaceFiles(packagesRoot).filter((filePath) => {
    return ['.ts', '.tsx'].includes(extname(filePath)) && !filePath.includes('.test.');
  });

  const keys = new Set<string>();
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }

  return [...keys].sort();
}

describe('drive i18n', () => {
  it('supports only english and simplified chinese', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'zh']);
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('normalizes locale variants and rejects unsupported values', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('zh-CN')).toBe('zh');
    expect(normalizeLanguage('ja-JP')).toBe('en');
    expect(normalizeLanguage(undefined)).toBe('en');
  });

  it('parses persisted zustand language state safely', () => {
    expect(getAppStoreLanguageFromSnapshot('{"state":{"language":"zh"}}')).toBe('zh');
    expect(getAppStoreLanguageFromSnapshot('{"language":"en"}')).toBe('en');
    expect(
      getAppStoreLanguageFromSnapshot('{"state":{"languagePreference":"system","language":"zh"}}'),
    ).toBeUndefined();
    expect(
      getAppStoreLanguageFromSnapshot('{"state":{"languagePreference":"en","language":"zh"}}'),
    ).toBe('en');
    expect(getAppStoreLanguageFromSnapshot('{"state":{"language":1}}')).toBeUndefined();
    expect(getAppStoreLanguageFromSnapshot('not-json')).toBeUndefined();
  });

  it('prefers the request cookie over persisted app state and browser hints', () => {
    const storage = {
      getItem(key: string) {
        if (key === APP_STORE_STORAGE_KEY) {
          return '{"state":{"language":"zh"}}';
        }

        if (key === I18N_STORAGE_KEY) {
          return 'en-US';
        }

        return null;
      },
    };

    expect(
      detectBrowserLanguage({
        storage,
        cookie: 'claw_lang=en',
        htmlLanguage: 'en-US',
        navigatorLanguage: 'en-US',
      }),
    ).toBe('en');
  });

  it('prefers persisted app state over detector cache when no cookie exists', () => {
    const storage = {
      getItem(key: string) {
        if (key === APP_STORE_STORAGE_KEY) {
          return '{"state":{"language":"zh"}}';
        }

        if (key === I18N_STORAGE_KEY) {
          return 'en-US';
        }

        return null;
      },
    };

    expect(
      detectBrowserLanguage({
        storage,
        htmlLanguage: 'en-US',
        navigatorLanguage: 'en-US',
      }),
    ).toBe('zh');
  });

  it('falls back cleanly when resolving request language', () => {
    expect(detectRequestLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
    expect(detectRequestLanguage('ja-JP,ja;q=0.9')).toBe('en');
    expect(detectRequestLanguage(undefined)).toBe('en');
  });

  it('exposes both resource bundles and drive-specific translation keys', async () => {
    const instance = await ensureI18n('zh-CN');

    expect(instance.hasResourceBundle('en', 'translation')).toBe(true);
    expect(instance.hasResourceBundle('zh', 'translation')).toBe(true);
    expect(instance.language).toBe('zh');
    expect(translationResources.en.translation.common.productName).toBe('SDKWork Drive');
    expect(typeof translationResources.en.translation.settings.account.profileTitle).toBe('string');
    expect(typeof translationResources.zh.translation.settings.account.profileTitle).toBe('string');
  });

  it('formats interpolated numeric counts with the active locale', async () => {
    const english = await ensureI18n('en');
    expect(english.t('market.labels.installCount', { count: 12345 })).toBe('12,345 installs');

    const chinese = await ensureI18n('zh');
    expect(chinese.t('community.postDetail.meta.views', { count: 12345 })).toBe('12,345 次浏览');
  });

  it('keeps english and chinese locale key sets aligned', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(zh).sort());
  });

  it('covers every translation key used in workspace source', () => {
    const usedKeys = collectTranslationUsageKeys();
    const englishKeys = new Set(flattenKeys(en));
    const chineseKeys = new Set(flattenKeys(zh));

    const missingInEnglish = usedKeys.filter((key) => !englishKeys.has(key));
    const missingInChinese = usedKeys.filter((key) => !chineseKeys.has(key));

    expect(missingInEnglish).toEqual([]);
    expect(missingInChinese).toEqual([]);
  });

  it('formats numbers, currency, dates, times, and relative time by language', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'zh')).toBe('1,234,567');
    expect(formatCurrency(42.2, 'en')).toBe('$42.20');
    expect(formatCurrency(42.2, 'zh', 'USD').length > 0).toBe(true);
    expect(formatDate('2026-03-17T00:00:00.000Z', 'en').length > 0).toBe(true);
    expect(formatTime('2026-03-17T14:35:00.000Z', 'zh').length > 0).toBe(true);
    expect(
      formatRelativeTime(
        '2026-03-17T14:33:00.000Z',
        'en',
        '2026-03-17T14:35:00.000Z',
      ),
    ).toBe('2 minutes ago');
    expect(
      formatRelativeTime(
        '2026-03-17T14:33:00.000Z',
        'zh',
        '2026-03-17T14:35:00.000Z',
      ).includes('2'),
    ).toBe(true);
  });

  it('resolves localized text and deep-maps nested structures', () => {
    expect(resolveLocalizedText(localizedText('Settings', '设置'), 'en-US')).toBe('Settings');
    expect(resolveLocalizedText(localizedText('Settings', '设置'), 'zh-CN')).toBe('设置');
    expect(resolveLocalizedText(localizedText('Settings', '设置'), 'ja-JP')).toBe('Settings');

    expect(
      localizeValue(
        {
          title: localizedText('Security', '安全'),
          actions: [localizedText('Save', '保存')],
          nested: {
            subtitle: localizedText('Protect your account', '保护你的账户'),
          },
        },
        'zh-CN',
      ),
    ).toEqual({
      title: '安全',
      actions: ['保存'],
      nested: {
        subtitle: '保护你的账户',
      },
    });
  });

  it('keeps locale resources centralized in the drive i18n package', () => {
    const localeDirectories = collectWorkspaceFiles(packagesRoot)
      .filter((filePath) => filePath.endsWith(`${extname(filePath)}`))
      .map((filePath) => dirname(filePath))
      .filter((directoryPath) => directoryPath.endsWith(`${join('src', 'locales')}`));

    const uniqueDirectories = [...new Set(localeDirectories)].map((directoryPath) =>
      relative(workspaceRoot, directoryPath).replaceAll('\\', '/'),
    );

    expect(uniqueDirectories).toEqual(['packages/sdkwork-drive-i18n/src/locales']);
  });

  it('allows chinese text only in approved locale resources', () => {
    const offenders = collectWorkspaceFiles(packagesRoot)
      .filter((filePath) => {
        if (!filePath.split(/[/\\]/).includes('src')) {
          return false;
        }

        if (filePath.includes('.test.')) {
          return false;
        }

        if (filePath.startsWith(approvedLocaleDirectory)) {
          return false;
        }

        const content = readFileSync(filePath, 'utf8');
        return /[\p{Script=Han}]|\uFFFD/u.test(content);
      })
      .map((filePath) => relative(workspaceRoot, filePath));

    expect(offenders).toEqual([]);
  });
});
