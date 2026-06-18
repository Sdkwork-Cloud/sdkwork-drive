export type SdkworkEnvironment = 'development' | 'test' | 'staging' | 'production';
export type SdkworkConfigProfile = 'dev' | 'test' | 'staging' | 'prod';
export type SdkworkBuildMode = 'development' | 'test' | 'staging' | 'production';
export type SdkworkDeploymentMode =
  | 'web'
  | 'desktop'
  | 'tablet-ipados'
  | 'tablet-android'
  | 'server'
  | 'container'
  | 'saas'
  | 'private'
  | 'local'
  | 'test';
export type SdkworkRuntimeTarget =
  | 'browser'
  | 'desktop'
  | 'tablet-ipados'
  | 'tablet-android'
  | 'server'
  | 'container'
  | 'test-runner';

export interface SdkworkDependencySdkBaseUrls {
  openApiBaseUrl?: string;
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
}

export interface SdkworkSdkBaseUrlConfig {
  defaultApiBaseUrl?: string;
  openApiBaseUrl?: string;
  appApiBaseUrl: string;
  backendApiBaseUrl?: string;
  dependencySdkBaseUrls: Record<string, SdkworkDependencySdkBaseUrls>;
}

export interface SdkworkAuthRuntimeConfig {
  tokenManagerMode: 'appbase-global' | 'service-context' | 'test';
  tokenStorage:
    | 'memory'
    | 'browser-session'
    | 'browser-local'
    | 'os-secure-storage'
    | 'server-context';
  accessTokenHeader: 'Access-Token';
  authTokenHeader: 'Authorization';
  refreshEnabled: boolean;
}

export type DriveHosting = 'self-hosted' | 'cloud-hosted';

export interface DriveRuntimeConfig {
  hosting: DriveHosting;
  environment: SdkworkEnvironment;
  configProfile: SdkworkConfigProfile;
  buildMode: SdkworkBuildMode;
  deploymentMode: SdkworkDeploymentMode;
  runtimeTarget: SdkworkRuntimeTarget;
  appKey: 'sdkwork-drive-pc';
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  adminStorageApiBaseUrl: string;
  sdkBaseUrls: SdkworkSdkBaseUrlConfig;
  auth: SdkworkAuthRuntimeConfig;
}

export interface RuntimeEnv {
  VITE_DRIVE_PC_HOSTING?: string;
  VITE_DRIVE_PC_TOPOLOGY?: string;
  VITE_DRIVE_PC_APPLICATION_PUBLIC_HTTP_URL?: string;
  VITE_DRIVE_PC_PLATFORM_API_GATEWAY_HTTP_URL?: string;
  VITE_DRIVE_PC_ENVIRONMENT?: string;
  VITE_DRIVE_PC_CONFIG_PROFILE?: string;
  VITE_DRIVE_PC_BUILD_MODE?: string;
  VITE_DRIVE_PC_DEPLOYMENT_MODE?: string;
  VITE_DRIVE_PC_RUNTIME_TARGET?: string;
  VITE_DRIVE_PC_API_GATEWAY_BASE_URL?: string;
  VITE_DRIVE_PC_APP_API_BASE_URL?: string;
  VITE_DRIVE_PC_BACKEND_API_BASE_URL?: string;
  VITE_DRIVE_PC_APPBASE_APP_API_BASE_URL?: string;
  VITE_DRIVE_PC_DRIVE_APP_API_BASE_URL?: string;
  VITE_DRIVE_PC_DRIVE_ADMIN_STORAGE_API_BASE_URL?: string;
  VITE_DRIVE_PC_DEV_SAME_ORIGIN_API?: string;
  VITE_DRIVE_PC_TOKEN_MANAGER_MODE?: string;
  VITE_DRIVE_PC_TOKEN_STORAGE?: string;
  DEV?: boolean;
  MODE?: string;
  PROD?: boolean;
}

const APP_KEY = 'sdkwork-drive-pc';
const LOCAL_API_GATEWAY_BASE_URL = 'http://127.0.0.1:3900';
const LOCAL_APP_API_BASE_URL = LOCAL_API_GATEWAY_BASE_URL;
const LOCAL_ADMIN_STORAGE_API_BASE_URL = LOCAL_API_GATEWAY_BASE_URL;
const CLOUD_API_GATEWAY_BASE_URL = 'https://api.sdkwork.com';
const CLOUD_APP_API_BASE_URL = 'https://drive.sdkwork.com/app/v3/api';
const CLOUD_ADMIN_STORAGE_API_BASE_URL = 'https://drive.sdkwork.com/admin/v3/api';

const VALID_ENVIRONMENTS: SdkworkEnvironment[] = [
  'development',
  'test',
  'staging',
  'production',
];
const VALID_CONFIG_PROFILES: SdkworkConfigProfile[] = ['dev', 'test', 'staging', 'prod'];
const VALID_BUILD_MODES: SdkworkBuildMode[] = [
  'development',
  'test',
  'staging',
  'production',
];
const VALID_DEPLOYMENT_MODES: SdkworkDeploymentMode[] = [
  'web',
  'desktop',
  'tablet-ipados',
  'tablet-android',
  'server',
  'container',
  'saas',
  'private',
  'local',
  'test',
];
const VALID_RUNTIME_TARGETS: SdkworkRuntimeTarget[] = [
  'browser',
  'desktop',
  'tablet-ipados',
  'tablet-android',
  'server',
  'container',
  'test-runner',
];

function normalized(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

function parseOneOf<T extends string>(
  value: string | undefined,
  validValues: readonly T[],
  fallback: T,
): T {
  const nextValue = normalized(value);
  if (nextValue && validValues.includes(nextValue as T)) {
    return nextValue as T;
  }
  return fallback;
}

function normalizeEnvironment(value: string | undefined, env: RuntimeEnv): SdkworkEnvironment {
  const nextValue = normalized(value);
  if (nextValue === 'dev') {
    return 'development';
  }
  if (nextValue === 'prod') {
    return 'production';
  }
  if (nextValue && VALID_ENVIRONMENTS.includes(nextValue as SdkworkEnvironment)) {
    return nextValue as SdkworkEnvironment;
  }
  if (env.PROD) {
    return 'production';
  }
  return 'development';
}

function normalizeProfile(
  value: string | undefined,
  environment: SdkworkEnvironment,
): SdkworkConfigProfile {
  const nextValue = normalized(value);
  if (nextValue && VALID_CONFIG_PROFILES.includes(nextValue as SdkworkConfigProfile)) {
    return nextValue as SdkworkConfigProfile;
  }
  if (environment === 'production') {
    return 'prod';
  }
  if (environment === 'development') {
    return 'dev';
  }
  return environment;
}

function normalizeBuildMode(
  value: string | undefined,
  env: RuntimeEnv,
  environment: SdkworkEnvironment,
): SdkworkBuildMode {
  const nextValue = normalized(value ?? env.MODE);
  if (nextValue === 'dev') {
    return 'development';
  }
  if (nextValue === 'prod') {
    return 'production';
  }
  return parseOneOf(nextValue, VALID_BUILD_MODES, environment);
}

function normalizeHosting(
  value: string | undefined,
  deploymentMode: SdkworkDeploymentMode,
  _environment: SdkworkEnvironment,
): DriveHosting {
  const explicit = normalized(value);
  if (explicit === 'cloud-hosted' || explicit === 'self-hosted') {
    return explicit;
  }
  if (explicit === 'cloud') {
    return 'cloud-hosted';
  }
  if (explicit === 'standalone') {
    return 'self-hosted';
  }
  if (deploymentMode === 'local' || deploymentMode === 'test') {
    return 'self-hosted';
  }
  return 'cloud-hosted';
}

function defaultPlatformApiGatewayBaseUrl(
  hosting: DriveHosting,
  deploymentMode: SdkworkDeploymentMode,
): string {
  if (hosting === 'self-hosted') {
    return LOCAL_API_GATEWAY_BASE_URL;
  }
  return deploymentMode === 'local' || deploymentMode === 'test'
    ? LOCAL_API_GATEWAY_BASE_URL
    : CLOUD_API_GATEWAY_BASE_URL;
}

function defaultApplicationPublicHttpUrl(
  hosting: DriveHosting,
  deploymentMode: SdkworkDeploymentMode,
): string {
  if (hosting === 'self-hosted') {
    return LOCAL_APP_API_BASE_URL;
  }
  return deploymentMode === 'local' || deploymentMode === 'test'
    ? LOCAL_APP_API_BASE_URL
    : CLOUD_APP_API_BASE_URL.replace('/app/v3/api', '');
}

function defaultAppApiBaseUrl(
  hosting: DriveHosting,
  deploymentMode: SdkworkDeploymentMode,
): string {
  if (hosting === 'self-hosted') {
    return LOCAL_APP_API_BASE_URL;
  }
  return deploymentMode === 'local' || deploymentMode === 'test'
    ? LOCAL_APP_API_BASE_URL
    : CLOUD_APP_API_BASE_URL;
}

function defaultAdminStorageApiBaseUrl(
  hosting: DriveHosting,
  deploymentMode: SdkworkDeploymentMode,
): string {
  if (hosting === 'self-hosted') {
    return LOCAL_ADMIN_STORAGE_API_BASE_URL;
  }
  return deploymentMode === 'local' || deploymentMode === 'test'
    ? LOCAL_ADMIN_STORAGE_API_BASE_URL
    : CLOUD_ADMIN_STORAGE_API_BASE_URL;
}

function normalizeTokenManagerMode(
  value: string | undefined,
  environment: SdkworkEnvironment,
): SdkworkAuthRuntimeConfig['tokenManagerMode'] {
  if (value === 'service-context' || value === 'test') {
    return value;
  }
  return environment === 'test' ? 'test' : 'appbase-global';
}

function shouldUseDevSameOriginApi(
  env: RuntimeEnv,
  deploymentMode: SdkworkDeploymentMode,
): boolean {
  const explicit = normalized(env.VITE_DRIVE_PC_DEV_SAME_ORIGIN_API);
  if (explicit === 'true' || explicit === '1') {
    return true;
  }
  if (explicit === 'false' || explicit === '0') {
    return false;
  }
  return Boolean(env.DEV)
    && normalized(env.MODE) === 'development'
    && (deploymentMode === 'local' || deploymentMode === 'test');
}

function applyDevSameOriginApiBaseUrl(
  env: RuntimeEnv,
  deploymentMode: SdkworkDeploymentMode,
  baseUrl: string,
): string {
  return shouldUseDevSameOriginApi(env, deploymentMode) ? '' : baseUrl;
}

function normalizeTokenStorage(
  value: string | undefined,
  runtimeTarget: SdkworkRuntimeTarget,
  environment: SdkworkEnvironment,
): SdkworkAuthRuntimeConfig['tokenStorage'] {
  if (
    value === 'memory'
    || value === 'browser-session'
    || value === 'browser-local'
    || value === 'os-secure-storage'
    || value === 'server-context'
  ) {
    return value;
  }
  if (environment === 'test') {
    return 'memory';
  }
  return runtimeTarget === 'desktop' ? 'os-secure-storage' : 'browser-session';
}

export function createRuntimeConfig(env: RuntimeEnv = {}): DriveRuntimeConfig {
  const environment = normalizeEnvironment(env.VITE_DRIVE_PC_ENVIRONMENT, env);
  const deploymentMode = parseOneOf(
    env.VITE_DRIVE_PC_DEPLOYMENT_MODE,
    VALID_DEPLOYMENT_MODES,
    environment === 'test' ? 'test' : 'local',
  );
  const hosting = normalizeHosting(
    env.VITE_DRIVE_PC_HOSTING ?? env.VITE_DRIVE_PC_TOPOLOGY,
    deploymentMode,
    environment,
  );
  const runtimeTarget = parseOneOf(
    env.VITE_DRIVE_PC_RUNTIME_TARGET,
    VALID_RUNTIME_TARGETS,
    environment === 'test' ? 'test-runner' : 'browser',
  );
  const configProfile = normalizeProfile(env.VITE_DRIVE_PC_CONFIG_PROFILE, environment);
  const buildMode = normalizeBuildMode(env.VITE_DRIVE_PC_BUILD_MODE, env, environment);

  const platformApiGatewayBaseUrl = env.VITE_DRIVE_PC_PLATFORM_API_GATEWAY_HTTP_URL
    || env.VITE_DRIVE_PC_API_GATEWAY_BASE_URL
    || defaultPlatformApiGatewayBaseUrl(hosting, deploymentMode);

  const appApiBaseUrl =
    env.VITE_DRIVE_PC_DRIVE_APP_API_BASE_URL
    || env.VITE_DRIVE_PC_APP_API_BASE_URL
    || env.VITE_DRIVE_PC_APPLICATION_PUBLIC_HTTP_URL
    || platformApiGatewayBaseUrl;
  const adminStorageApiBaseUrl =
    env.VITE_DRIVE_PC_DRIVE_ADMIN_STORAGE_API_BASE_URL
    || env.VITE_DRIVE_PC_BACKEND_API_BASE_URL
    || platformApiGatewayBaseUrl;
  const backendApiBaseUrl =
    env.VITE_DRIVE_PC_BACKEND_API_BASE_URL || adminStorageApiBaseUrl;
  const appbaseAppApiBaseUrl = applyDevSameOriginApiBaseUrl(
    env,
    deploymentMode,
    env.VITE_DRIVE_PC_APPBASE_APP_API_BASE_URL || platformApiGatewayBaseUrl,
  );

  const resolvedAppApiBaseUrl = applyDevSameOriginApiBaseUrl(env, deploymentMode, appApiBaseUrl);
  const resolvedBackendApiBaseUrl = applyDevSameOriginApiBaseUrl(
    env,
    deploymentMode,
    backendApiBaseUrl,
  );
  const resolvedAdminStorageApiBaseUrl = applyDevSameOriginApiBaseUrl(
    env,
    deploymentMode,
    adminStorageApiBaseUrl,
  );

  return {
    hosting,
    environment,
    configProfile,
    buildMode,
    deploymentMode,
    runtimeTarget,
    appKey: APP_KEY,
    appApiBaseUrl: resolvedAppApiBaseUrl,
    backendApiBaseUrl: resolvedBackendApiBaseUrl,
    adminStorageApiBaseUrl: resolvedAdminStorageApiBaseUrl,
    sdkBaseUrls: {
      defaultApiBaseUrl: resolvedAppApiBaseUrl,
      appApiBaseUrl: resolvedAppApiBaseUrl,
      backendApiBaseUrl: resolvedBackendApiBaseUrl,
      dependencySdkBaseUrls: {
        'sdkwork-appbase-app-sdk': {
          appApiBaseUrl: appbaseAppApiBaseUrl,
        },
        'sdkwork-drive-app-sdk': {
          appApiBaseUrl: resolvedAppApiBaseUrl,
        },
        'sdkwork-drive-admin-storage-sdk': {
          backendApiBaseUrl: resolvedAdminStorageApiBaseUrl,
        },
      },
    },
    auth: {
      tokenManagerMode: normalizeTokenManagerMode(
        env.VITE_DRIVE_PC_TOKEN_MANAGER_MODE,
        environment,
      ),
      tokenStorage: normalizeTokenStorage(
        env.VITE_DRIVE_PC_TOKEN_STORAGE,
        runtimeTarget,
        environment,
      ),
      accessTokenHeader: 'Access-Token',
      authTokenHeader: 'Authorization',
      refreshEnabled: environment !== 'test',
    },
  };
}
