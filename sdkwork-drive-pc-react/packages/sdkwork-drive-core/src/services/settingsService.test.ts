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

describe('settingsService', () => {
  beforeEach(() => {
    let notificationSettingsState = {
      enableEmail: true,
      enableInApp: true,
      typeSettings: {
        TASK: {
          enableEmail: true,
          enableInApp: true,
        },
        MESSAGE: {
          enableInApp: true,
        },
        ALERT: {
          enableEmail: true,
        },
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (
        url.endsWith('/app/v3/api/user/profile')
        && (!init?.method || init.method === 'GET')
      ) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              nickname: 'Drive Pilot',
              email: 'pilot@example.com',
              avatar: 'https://cdn.example.com/avatar.png',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/user/profile') && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              nickname: 'Drive Pilot',
              email: 'pilot@example.com',
              avatar: 'https://cdn.example.com/avatar.png',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/user/password')) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        url.endsWith('/app/v3/api/notification/settings')
        && (!init?.method || init.method === 'GET')
      ) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: notificationSettingsState,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/notification/settings') && init?.method === 'PUT') {
        notificationSettingsState = {
          ...notificationSettingsState,
          enableEmail: false,
        };

        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: notificationSettingsState,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (/\/app\/v3\/api\/notification\/settings\/[^/]+$/.test(url)) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: null,
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

  it('maps the remote user profile into the local settings profile shape', async () => {
    const { settingsService } = await import('./settingsService.ts');

    await expect(settingsService.getProfile()).resolves.toEqual({
      firstName: 'Drive',
      lastName: 'Pilot',
      email: 'pilot@example.com',
      avatarUrl: 'https://cdn.example.com/avatar.png',
    });
  });

  it('updates preferences and merges local overlay values', async () => {
    const { settingsService } = await import('./settingsService.ts');

    const nextPreferences = await settingsService.updatePreferences({
      general: {
        launchOnStartup: true,
        startMinimized: false,
      },
      notifications: {
        systemUpdates: false,
        taskFailures: false,
        securityAlerts: true,
        taskCompletions: true,
        newMessages: true,
      },
    });

    expect(nextPreferences.general.launchOnStartup).toBe(true);
    expect(nextPreferences.notifications.systemUpdates).toBe(false);
  });

  it('swallows storage access failures when reading and writing the local settings overlay', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem() {
          throw new Error('blocked');
        },
        setItem() {
          throw new Error('blocked');
        },
      } satisfies Pick<Storage, 'getItem' | 'setItem'>,
    });

    const { settingsService } = await import('./settingsService.ts');

    await expect(settingsService.getPreferences()).resolves.toMatchObject({
      general: {
        launchOnStartup: false,
        startMinimized: false,
      },
      privacy: {
        shareUsageData: false,
        personalizedRecommendations: false,
      },
      security: {
        twoFactorAuth: false,
        loginAlerts: true,
      },
    });

    await expect(settingsService.updatePreferences({
      general: {
        launchOnStartup: true,
      },
    })).resolves.toMatchObject({
      general: {
        launchOnStartup: true,
      },
    });
  });

  it('does not persist the local overlay when remote preference updates fail', async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (
        url.endsWith('/app/v3/api/notification/settings')
        && (!init?.method || init.method === 'GET')
      ) {
        return new Response(
          JSON.stringify({
            code: '2000',
            msg: 'success',
            data: {
              enableEmail: true,
              enableInApp: true,
              typeSettings: {},
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/app/v3/api/notification/settings') && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            code: '5000',
            msg: 'update failed',
            data: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ code: '404', msg: 'Not found', data: null }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const { settingsService } = await import('./settingsService.ts');

    await expect(settingsService.updatePreferences({
      general: {
        launchOnStartup: true,
      },
      notifications: {
        systemUpdates: false,
      },
    })).rejects.toThrow();

    expect(storage.getItem('sdkwork-drive-settings-overlay')).toBeNull();
  });
});
