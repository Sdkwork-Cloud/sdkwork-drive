import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

describe('appAuthService', () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      const url = String(input);

      if (url.endsWith('/app/v3/api/auth/oauth/url')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              authUrl: 'https://oauth.example.com/authorize?client_id=demo',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/oauth/login')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              authToken: 'oauth-auth-token',
              accessToken: 'oauth-access-token',
              refreshToken: 'oauth-refresh-token',
              tokenType: 'Bearer',
              expiresIn: 3600,
              userInfo: {
                username: 'octocat',
                email: 'octocat@example.com',
                nickname: 'Octo Cat',
                avatar: 'https://cdn.example.com/octocat.png',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/qr/generate')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              type: 'WECHAT_OFFICIAL_ACCOUNT',
              title: 'WeChat QR Login',
              description: 'Scan with the official account.',
              qrKey: 'qr-login-1',
              qrUrl: 'https://cdn.example.com/qr-login-1.png',
              qrContent: 'https://sdkwork.com/app/v3/api/auth/qr/entry/qr-login-1',
              expireTime: 300,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/qr/status/qr-login-1')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              status: 'confirmed',
              userInfo: {
                username: 'wechat-user',
                email: 'wechat-user@example.com',
                nickname: 'WeChat User',
                avatar: 'https://cdn.example.com/wechat-user.png',
              },
              token: {
                authToken: 'qr-auth-token',
                accessToken: 'qr-access-token',
                refreshToken: 'qr-refresh-token',
                tokenType: 'Bearer',
                expiresIn: 3600,
                userInfo: {
                  username: 'wechat-user',
                  email: 'wechat-user@example.com',
                  nickname: 'WeChat User',
                  avatar: 'https://cdn.example.com/wechat-user.png',
                },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ code: 404, message: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  });

  it('requests OAuth authorization urls through the generated app sdk auth client', async () => {
    const { appAuthService } = await import('./appAuthService.ts');

    const authUrl = await appAuthService.getOAuthAuthorizationUrl({
      provider: 'github',
      redirectUri: 'https://drive.example.com/login/oauth/callback/github?redirect=%2Fdrive',
      state: '/drive',
    });

    expect(authUrl).toBe('https://oauth.example.com/authorize?client_id=demo');

    const oauthUrlRequest = fetchCalls.find(({ input }) =>
      String(input).endsWith('/app/v3/api/auth/oauth/url'),
    );

    expect(oauthUrlRequest).toBeDefined();
    expect(oauthUrlRequest?.init?.method).toBe('POST');
    expect(JSON.parse(String(oauthUrlRequest?.init?.body ?? '{}'))).toEqual({
      provider: 'GITHUB',
      redirectUri: 'https://drive.example.com/login/oauth/callback/github?redirect=%2Fdrive',
      state: '/drive',
    });
  });

  it('completes oauth login and persists returned session tokens', async () => {
    const { appAuthService } = await import('./appAuthService.ts');
    const { readAppSdkSessionTokens } = await import('../sdk/useAppSdkClient.ts');

    const session = await appAuthService.loginWithOAuth({
      provider: 'github',
      code: 'oauth-code',
      state: 'oauth-state',
      deviceType: 'web',
    });

    expect(session.authToken).toBe('oauth-auth-token');
    expect(session.refreshToken).toBe('oauth-refresh-token');
    expect(session.userInfo?.nickname).toBe('Octo Cat');
    expect(readAppSdkSessionTokens().authToken).toBe('oauth-auth-token');
    expect(readAppSdkSessionTokens().refreshToken).toBe('oauth-refresh-token');
  });

  it('generates login qr payloads from backend qr metadata', async () => {
    const { appAuthService } = await import('./appAuthService.ts');

    const qrCode = await appAuthService.generateLoginQrCode();

    expect(qrCode).toEqual({
      type: 'WECHAT_OFFICIAL_ACCOUNT',
      title: 'WeChat QR Login',
      description: 'Scan with the official account.',
      qrKey: 'qr-login-1',
      qrUrl: 'https://cdn.example.com/qr-login-1.png',
      qrContent: 'https://sdkwork.com/app/v3/api/auth/qr/entry/qr-login-1',
      expireTime: 300,
    });
  });

  it('persists confirmed qr login sessions while polling qr status', async () => {
    const { appAuthService } = await import('./appAuthService.ts');
    const { readAppSdkSessionTokens } = await import('../sdk/useAppSdkClient.ts');

    const result = await appAuthService.checkLoginQrCodeStatus('qr-login-1');

    expect(result.status).toBe('confirmed');
    expect(result.session?.authToken).toBe('qr-auth-token');
    expect(result.session?.refreshToken).toBe('qr-refresh-token');
    expect(result.session?.userInfo?.nickname).toBe('WeChat User');
    expect(readAppSdkSessionTokens().authToken).toBe('qr-auth-token');
    expect(readAppSdkSessionTokens().refreshToken).toBe('qr-refresh-token');
  });
});
