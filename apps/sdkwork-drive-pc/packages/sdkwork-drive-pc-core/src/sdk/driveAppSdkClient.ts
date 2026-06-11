import {
  createDriveUploaderClient,
  createGeneratedDriveAppClient,
  operations,
  sdkMetadata,
  type DriveUploaderClient,
  type DriveUploaderTransport,
} from '@sdkwork/drive-app-sdk';
import type { DriveRuntimeConfig } from '../config/runtimeConfig';
import type { DriveSessionTokenManager } from '../session/sessionTokenManager';
import {
  buildGeneratedSdkPath,
  compactQuery,
  normalizeGeneratedSdkBaseUrl,
  normalizeGeneratedSdkError,
  type TokenManagerAwareGeneratedSdkClient,
} from './generatedSdkTransport';

export type DriveAppOperationId = keyof typeof operations;

export interface DriveAppSdkRequest {
  operationId: DriveAppOperationId;
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface DriveAppSdkClient {
  metadata: typeof sdkMetadata;
  operations: typeof operations;
  uploader: DriveUploaderClient;
  request<T>(request: DriveAppSdkRequest): Promise<T>;
  setTokenManager(manager: DriveSessionTokenManager): void;
}

export interface DriveAppSdkClientOptions {
  config: DriveRuntimeConfig;
  sdkClient?: TokenManagerAwareGeneratedSdkClient;
  tokenManager: DriveSessionTokenManager;
}

export class DriveAppSdkError extends Error {
  readonly operationId: DriveAppOperationId;
  readonly status: number;
  readonly title?: string;
  readonly detail?: string;
  readonly code?: string;
  readonly traceId?: string;
  readonly requestId?: string;

  constructor({
    operationId,
    status,
    title,
    detail,
    code,
    traceId,
    requestId,
  }: {
    operationId: DriveAppOperationId;
    status: number;
    title?: string;
    detail?: string;
    code?: string;
    traceId?: string;
    requestId?: string;
  }) {
    super(detail || title || `Drive App API ${operationId} failed with HTTP ${status}`);
    this.name = 'DriveAppSdkError';
    this.operationId = operationId;
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.code = code;
    this.traceId = traceId;
    this.requestId = requestId;
  }
}

function buildSdkError(
  operationId: DriveAppOperationId,
  error: unknown,
): DriveAppSdkError {
  const details = normalizeGeneratedSdkError(error);
  return new DriveAppSdkError({
    operationId,
    status: details.status,
    title: details.title,
    detail: details.detail,
    code: details.code,
    traceId: details.traceId,
    requestId: details.requestId,
  });
}

export function createDriveAppSdkClient({
  config,
  sdkClient,
  tokenManager,
}: DriveAppSdkClientOptions): DriveAppSdkClient {
  const generatedClient = sdkClient ?? createGeneratedDriveAppClient({
    authMode: 'dual-token',
    baseUrl: normalizeGeneratedSdkBaseUrl(config.appApiBaseUrl, sdkMetadata.apiPrefix),
    tokenManager,
  }) as TokenManagerAwareGeneratedSdkClient;
  generatedClient.setTokenManager(tokenManager);

  const client = {
    metadata: {
      ...sdkMetadata,
      baseUrl: config.appApiBaseUrl,
    },
    operations,
    uploader: undefined as unknown as DriveUploaderClient,
    async request<T>({
      operationId,
      pathParams,
      query,
      body,
      signal,
    }: DriveAppSdkRequest): Promise<T> {
      const operation = operations[operationId];
      try {
        return await generatedClient.http.request<T>(
          buildGeneratedSdkPath(operation.path, pathParams),
          {
            method: operation.method,
            params: compactQuery(query),
            body,
            contentType: body === undefined ? undefined : 'application/json',
            signal,
          },
        );
      } catch (error) {
        throw buildSdkError(operationId, error);
      }
    },
    setTokenManager(manager: DriveSessionTokenManager) {
      generatedClient.setTokenManager(manager);
    },
  };
  client.uploader = createDriveUploaderClient({
    transport: createDriveUploaderTransport(client),
  });
  return client;
}

export function createDriveUploaderTransport(
  client: Pick<DriveAppSdkClient, 'request'>,
): DriveUploaderTransport {
  return {
    drive: {
      uploader: {
        uploads: {
          prepare: (body, options) =>
            client.request({
              operationId: 'uploader.uploads.prepare',
              body,
              signal: options?.signal,
            }),
          parts: {
            markUploaded: (uploadItemId, partNo, body, options) =>
              client.request({
                operationId: 'uploader.uploads.parts.markUploaded',
                pathParams: {
                  uploadItemId,
                  partNo,
                },
                body,
                signal: options?.signal,
              }),
          },
        },
      },
      uploadSessions: {
        create: (body, options) =>
          client.request({
            operationId: 'uploadSessions.create',
            body,
            signal: options?.signal,
          }),
        parts: {
          presign: (uploadSessionId, partNo, body, options) =>
            client.request({
              operationId: 'uploadSessions.parts.presign',
              pathParams: {
                uploadSessionId,
                partNo,
              },
              body,
              signal: options?.signal,
            }),
        },
        complete: (uploadSessionId, body, options) =>
          client.request({
            operationId: 'uploadSessions.complete',
            pathParams: {
              uploadSessionId,
            },
            body,
            signal: options?.signal,
          }),
        abort: (uploadSessionId, body, options) =>
          client.request({
            operationId: 'uploadSessions.abort',
            pathParams: {
              uploadSessionId,
            },
            body,
            signal: options?.signal,
          }),
      },
    },
  };
}
