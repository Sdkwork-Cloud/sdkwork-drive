import { useMemo } from 'react';
import {
  createClient,
  type SdkworkAppClient,
  type SdkworkAppConfig,
} from '@sdkwork/app-sdk';

export type AppRuntimeEnv = 'development' | 'staging' | 'production' | 'test';

export interface AppSdkClientConfig extends SdkworkAppConfig {
  env: AppRuntimeEnv;
}

export interface AppSdkSessionTokens {
  authToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_DEV_BASE_URL = 'https://api-dev.sdkwork.com';
const DEFAULT_TEST_BASE_URL = 'https://api-test.sdkwork.com';
const DEFAULT_PROD_BASE_URL = 'https://api.sdkwork.com';
export const APP_SDK_SESSION_STORAGE_KEY = 'sdkwork-drive-auth-session';

let appSdkClient: SdkworkAppClient | null = null;
let appSdkConfig: AppSdkClientConfig | null = null;

function readEnv(name: string): string | undefined {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.[name];
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function normalizeAuthToken(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.toLowerCase().startsWith('bearer ')
    ? normalized.slice(7).trim()
    : normalized;
}

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return null;
}

function readStorage(key: string): string | undefined {
  try {
    return getStorage()?.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value?: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    if (value && value.trim()) {
      storage.setItem(key, value.trim());
    } else {
      storage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

function removeStorage(key: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function resolveRuntimeEnv(): AppRuntimeEnv {
  const value = (readEnv('VITE_APP_ENV') || 'development').toLowerCase();
  if (value === 'production' || value === 'prod') {
    return 'production';
  }
  if (value === 'staging' || value === 'stage') {
    return 'staging';
  }
  if (value === 'test') {
    return 'test';
  }
  return 'development';
}

function resolveDefaultBaseUrl(env: AppRuntimeEnv): string {
  if (env === 'production') {
    return DEFAULT_PROD_BASE_URL;
  }
  if (env === 'test') {
    return DEFAULT_TEST_BASE_URL;
  }
  return DEFAULT_DEV_BASE_URL;
}

function normalizeBaseUrl(baseUrl?: string, env: AppRuntimeEnv = 'development') {
  return (baseUrl || resolveDefaultBaseUrl(env)).trim().replace(/\/+$/g, '');
}

function readPersistedSession(): Pick<AppSdkSessionTokens, 'authToken' | 'refreshToken'> {
  const raw = readStorage(APP_SDK_SESSION_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSdkSessionTokens>;
    return {
      authToken: normalizeAuthToken(parsed.authToken),
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken.trim() : undefined,
    };
  } catch {
    return {};
  }
}

function writePersistedSession(tokens: Pick<AppSdkSessionTokens, 'authToken' | 'refreshToken'>) {
  const authToken = normalizeAuthToken(tokens.authToken);
  const refreshToken = (tokens.refreshToken || '').trim();

  if (!authToken) {
    removeStorage(APP_SDK_SESSION_STORAGE_KEY);
    return;
  }

  writeStorage(
    APP_SDK_SESSION_STORAGE_KEY,
    JSON.stringify({
      authToken,
      refreshToken: refreshToken || undefined,
    }),
  );
}

function applySessionTokensToClient(client: SdkworkAppClient, tokens: AppSdkSessionTokens) {
  client.setAuthToken(normalizeAuthToken(tokens.authToken));
  client.setAccessToken((tokens.accessToken ?? resolveAppSdkAccessToken()).trim());
}

export function createAppSdkClientConfig(
  overrides: Partial<SdkworkAppConfig> = {},
): AppSdkClientConfig {
  const env = resolveRuntimeEnv();
  const baseUrl = normalizeBaseUrl(firstDefined(overrides.baseUrl, readEnv('VITE_API_BASE_URL')), env);
  const accessToken = firstDefined(overrides.accessToken, readEnv('VITE_ACCESS_TOKEN'));
  const timeout = Number(overrides.timeout ?? readEnv('VITE_TIMEOUT'));

  return {
    env,
    baseUrl,
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT,
    apiKey: overrides.apiKey ?? firstDefined(readEnv('VITE_API_KEY')),
    authToken: overrides.authToken,
    accessToken,
    tenantId: overrides.tenantId ?? firstDefined(readEnv('VITE_TENANT_ID')),
    organizationId: overrides.organizationId ?? firstDefined(readEnv('VITE_ORGANIZATION_ID')),
    platform: overrides.platform ?? firstDefined(readEnv('VITE_PLATFORM')) ?? 'web',
    tokenManager: overrides.tokenManager,
    authMode: overrides.authMode,
    headers: overrides.headers,
  };
}

export function initAppSdkClient(overrides: Partial<SdkworkAppConfig> = {}) {
  appSdkConfig = createAppSdkClientConfig(overrides);
  appSdkClient = createClient(appSdkConfig);
  return appSdkClient;
}

export function getAppSdkClient() {
  return appSdkClient ?? initAppSdkClient();
}

export function getAppSdkClientConfig() {
  return appSdkConfig;
}

export function resolveAppSdkAccessToken() {
  return (getAppSdkClientConfig()?.accessToken || readEnv('VITE_ACCESS_TOKEN') || '').trim();
}

export function resetAppSdkClient() {
  appSdkClient = null;
  appSdkConfig = null;
}

export function applyAppSdkSessionTokens(tokens: AppSdkSessionTokens) {
  applySessionTokensToClient(getAppSdkClient(), tokens);
}

export function readAppSdkSessionTokens(): AppSdkSessionTokens {
  const stored = readPersistedSession();
  const accessToken = resolveAppSdkAccessToken();

  return {
    authToken: stored.authToken || undefined,
    accessToken: accessToken || undefined,
    refreshToken: stored.refreshToken || undefined,
  };
}

export function persistAppSdkSessionTokens(tokens: AppSdkSessionTokens) {
  const authToken = normalizeAuthToken(tokens.authToken);
  const refreshToken = (tokens.refreshToken || '').trim();
  const accessToken = (tokens.accessToken ?? resolveAppSdkAccessToken()).trim();

  writePersistedSession({
    authToken,
    refreshToken: refreshToken || undefined,
  });

  applySessionTokensToClient(getAppSdkClient(), {
    authToken,
    accessToken,
    refreshToken,
  });
}

export function clearAppSdkSessionTokens() {
  removeStorage(APP_SDK_SESSION_STORAGE_KEY);
  if (appSdkClient) {
    applySessionTokensToClient(appSdkClient, {
      authToken: '',
      accessToken: resolveAppSdkAccessToken(),
    });
  }
  resetAppSdkClient();
}

function createScopedAppSdkClient(overrides: Partial<SdkworkAppConfig> = {}) {
  const client = createClient(createAppSdkClientConfig(overrides));
  applySessionTokensToClient(client, readAppSdkSessionTokens());
  return client;
}

export function getAppSdkClientWithSession(overrides: Partial<SdkworkAppConfig> = {}) {
  if (Object.keys(overrides).length > 0) {
    return createScopedAppSdkClient(overrides);
  }

  const client = getAppSdkClient();
  applySessionTokensToClient(client, readAppSdkSessionTokens());
  return client;
}

export function useAppSdkClient(overrides: Partial<SdkworkAppConfig> = {}) {
  const key = JSON.stringify(overrides || {});
  return useMemo(() => getAppSdkClientWithSession(overrides), [key]);
}
