import type { AppAuthSocialProvider } from '@sdkwork/drive-core';

const APP_REDIRECT_ORIGIN = 'https://sdkwork.local';

export function resolveRedirectTarget(rawTarget: string | null) {
  const normalizedTarget = (rawTarget || '').trim();
  if (
    !normalizedTarget ||
    !normalizedTarget.startsWith('/') ||
    normalizedTarget.startsWith('//') ||
    normalizedTarget.includes('\\')
  ) {
    return '/drive';
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(normalizedTarget, APP_REDIRECT_ORIGIN);
  } catch {
    return '/drive';
  }

  if (parsedTarget.origin !== APP_REDIRECT_ORIGIN) {
    return '/drive';
  }

  const inAppTarget = `${parsedTarget.pathname}${parsedTarget.search}${parsedTarget.hash}`;

  if (
    parsedTarget.pathname === '/auth' ||
    parsedTarget.pathname === '/login' ||
    parsedTarget.pathname === '/register' ||
    parsedTarget.pathname === '/forgot-password' ||
    parsedTarget.pathname.startsWith('/login/oauth/callback')
  ) {
    return '/drive';
  }

  return inAppTarget;
}

export function buildOAuthCallbackUri(
  provider: AppAuthSocialProvider,
  redirectTarget: string,
): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    throw new Error('OAuth callback URL is unavailable in the current runtime.');
  }

  const callbackUrl = new URL(`/login/oauth/callback/${provider}`, window.location.origin);
  const safeRedirectTarget = resolveRedirectTarget(redirectTarget);
  if (safeRedirectTarget !== '/drive') {
    callbackUrl.searchParams.set('redirect', safeRedirectTarget);
  }
  return callbackUrl.toString();
}

