import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOAuthCallbackUri, resolveRedirectTarget } from './authRouteUtils.ts';

describe('authRouteUtils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the drive root for unsafe redirect targets', () => {
    expect(resolveRedirectTarget(null)).toBe('/drive');
    expect(resolveRedirectTarget('https://evil.example.com')).toBe('/drive');
    expect(resolveRedirectTarget('//evil.example.com')).toBe('/drive');
    expect(resolveRedirectTarget('/\\evil')).toBe('/drive');
    expect(resolveRedirectTarget('/login?redirect=%2Fsettings')).toBe('/drive');
  });

  it('keeps safe in-app redirect targets intact', () => {
    expect(resolveRedirectTarget('/drive?path=%2FDesign')).toBe('/drive?path=%2FDesign');
    expect(resolveRedirectTarget('/settings#profile')).toBe('/settings#profile');
  });

  it('sanitizes redirect targets before building oauth callback urls', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://drive.example.com',
      },
    });

    expect(buildOAuthCallbackUri('github', '/settings')).toBe(
      'https://drive.example.com/login/oauth/callback/github?redirect=%2Fsettings',
    );

    expect(buildOAuthCallbackUri('github', '//evil.example.com')).toBe(
      'https://drive.example.com/login/oauth/callback/github',
    );
  });
});
