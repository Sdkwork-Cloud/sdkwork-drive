import { describe, expect, it, vi } from 'vitest';
import { createRuntimeConfig } from '../config/runtimeConfig';
import {
  createSessionStore,
} from '../session/sessionStore';
import {
  createDriveSessionTokenManager,
} from '../session/sessionTokenManager';
import { createDriveAppSdkClient } from './driveAppSdkClient';
import type { DriveRuntimeConfig } from '../config/runtimeConfig';

const config: DriveRuntimeConfig = createRuntimeConfig({
  VITE_DRIVE_PC_ENVIRONMENT: 'test',
  VITE_DRIVE_PC_DEPLOYMENT_MODE: 'private',
  VITE_DRIVE_PC_DRIVE_APP_API_BASE_URL: 'https://drive.example.test',
  VITE_DRIVE_PC_DRIVE_ADMIN_STORAGE_API_BASE_URL:
    'https://drive-admin-storage.example.test',
});

describe('drive app sdk client', () => {
  it('binds the shared TokenManager and delegates requests through the generated Drive app SDK transport', async () => {
    const session = createSessionStore();
    session.setSession({
      authToken: 'auth-token',
      accessToken: 'access-token',
      context: {
        tenantId: 'tenant-001',
        userId: 'user-001',
        actorId: 'user-001',
        actorKind: 'user',
        permissionScope: ['drive.nodes.read', 'drive.nodes.write'],
        dataScope: ['tenant'],
      },
    });
    const tokenManager = createDriveSessionTokenManager(session);
    const request = vi.fn(async <T>(
      _path: string,
      _options?: Record<string, unknown>,
    ): Promise<T> => ({ items: [] }) as T);
    const sdkClient = {
      http: {
        request,
      },
      setTokenManager: vi.fn(),
    };

    const client = createDriveAppSdkClient({
      config,
      sdkClient: sdkClient as never,
      tokenManager,
    });

    await client.request({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'space-001' },
      query: { tenantId: 'tenant-001' },
    });

    expect(sdkClient.setTokenManager).toHaveBeenCalledWith(tokenManager);
    expect(tokenManager.getAuthToken()).toBe('auth-token');
    expect(tokenManager.getAccessToken()).toBe('access-token');
    expect(request).toHaveBeenCalledWith(
      '/app/v3/api/drive/spaces/space-001/nodes',
      {
        method: 'GET',
        params: { tenantId: 'tenant-001' },
        body: undefined,
        contentType: undefined,
        signal: undefined,
      },
    );
    expect(request.mock.calls[0]![1]).not.toHaveProperty('headers');
  });

  it('normalizes generated SDK failures at the Drive app SDK facade boundary', async () => {
    const tokenManager = createDriveSessionTokenManager(createSessionStore());
    const request = vi.fn(async <T>(): Promise<T> => {
      throw Object.assign(new Error('tenantId is required'), {
        code: 'drive.validation.tenant_id_required',
        httpStatus: 400,
        requestId: 'request-001',
        traceId: 'trace-001',
      });
    });
    const sdkClient = {
      http: {
        request,
      },
      setTokenManager: vi.fn(),
    };

    const client = createDriveAppSdkClient({
      config,
      sdkClient: sdkClient as never,
      tokenManager,
    });

    await expect(client.request({
      operationId: 'nodes.list',
      pathParams: { spaceId: 'space-001' },
    })).rejects.toMatchObject({
      name: 'DriveAppSdkError',
      message: 'tenantId is required',
      operationId: 'nodes.list',
      status: 400,
      detail: 'tenantId is required',
      code: 'drive.validation.tenant_id_required',
      traceId: 'trace-001',
      requestId: 'request-001',
    });
  });
});
