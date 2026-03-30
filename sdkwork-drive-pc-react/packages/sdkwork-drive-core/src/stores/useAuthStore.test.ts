import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

function createMemoryStorage(): StateStorage {
  const store = new Map<string, string>();

  return {
    getItem(name) {
      return store.get(name) ?? null;
    },
    setItem(name, value) {
      store.set(name, value);
    },
    removeItem(name) {
      store.delete(name);
    },
  };
}

const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

describe('useAuthStore', () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ input, init });
      const url = String(input);

      if (url.endsWith('/app/v3/api/auth/login')) {
        const body = JSON.parse(String(init?.body || '{}')) as { username?: string };
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              authToken: 'jwt-token',
              refreshToken: 'refresh-token',
              tokenType: 'Bearer',
              expiresIn: 3600,
              userInfo: {
                username: body.username,
                email: body.username,
                nickname: 'Drive Operator',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/register')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/logout')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/auth/password/reset/request')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: null,
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

      return new Response(JSON.stringify({ code: 404, message: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
  });

  it('signs in and persists the entered email', async () => {
    const storage = createMemoryStorage();
    const { createAuthStore } = await import('./useAuthStore.ts');
    const { readAppSdkSessionTokens } = await import('../sdk/useAppSdkClient.ts');

    const store = createAuthStore(storage);

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().user).toBeNull();

    await store.getState().signIn({
      email: 'drive-operator@example.com',
      password: 'secret',
    });

    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().user?.email).toBe('drive-operator@example.com');
    expect(store.getState().user?.displayName).toMatch(/\S/);
    expect(readAppSdkSessionTokens().authToken).toBe('jwt-token');
  });

  it('registers and signs out cleanly', async () => {
    const storage = createMemoryStorage();
    const { createAuthStore } = await import('./useAuthStore.ts');
    const { readAppSdkSessionTokens } = await import('../sdk/useAppSdkClient.ts');

    const store = createAuthStore(storage);

    await store.getState().register({
      name: 'Drive Operator',
      email: 'drive-operator@example.com',
      password: 'secret',
    });

    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().user?.displayName).toBe('Drive Operator');

    await store.getState().signOut();

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().user).toBeNull();
    expect(readAppSdkSessionTokens().authToken).toBeUndefined();
  });

  it('sends password reset requests through the backend auth client', async () => {
    const storage = createMemoryStorage();
    const { createAuthStore } = await import('./useAuthStore.ts');
    const store = createAuthStore(storage);

    await store.getState().sendPasswordReset(' drive-operator@example.com ');

    const resetRequest = fetchCalls.find(({ input }) =>
      String(input).endsWith('/app/v3/api/auth/password/reset/request'),
    );

    expect(resetRequest).toBeDefined();
    expect(resetRequest?.init?.method).toBe('POST');
    expect(JSON.parse(String(resetRequest?.init?.body ?? '{}'))).toEqual({
      account: 'drive-operator@example.com',
      channel: 'EMAIL',
    });
  });

  it('signs in with oauth providers and persists the returned identity', async () => {
    const storage = createMemoryStorage();
    const { createAuthStore } = await import('./useAuthStore.ts');
    const store = createAuthStore(storage);

    const user = await store.getState().signInWithOAuth({
      provider: 'github',
      code: 'oauth-code',
      state: 'oauth-state',
      deviceType: 'web',
    });

    expect(store.getState().isAuthenticated).toBe(true);
    expect(user.email).toBe('octocat@example.com');
    expect(user.displayName).toBe('Octo Cat');
  });
});
