import type { DriveAdminStorageSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import type {
  CreateStorageProviderInput,
  ListStorageProvidersInput,
  ListStorageProviderObjectsInput,
  ListStorageProviderObjectsResult,
  SetDefaultStorageProviderBindingInput,
  StorageProviderBindingView,
  StorageProviderBucketListItemView,
  StorageProviderBucketView,
  StorageProviderCapabilitiesView,
  StorageProviderMutationOptions,
  StorageProviderObjectView,
  StorageProviderView,
  UpdateStorageProviderInput,
} from '../types/storageProviderAdminTypes';

type JsonRecord = Record<string, unknown>;

export interface StorageProviderAdminService {
  listProviders(input?: ListStorageProvidersInput): Promise<StorageProviderView[]>;
  createProvider(
    input: CreateStorageProviderInput,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderView>;
  updateProvider(
    providerId: string,
    input: UpdateStorageProviderInput,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderView>;
  deleteProvider(providerId: string, options?: StorageProviderMutationOptions): Promise<boolean>;
  testProvider(providerId: string, options?: StorageProviderMutationOptions): Promise<boolean>;
  activateProvider(providerId: string, options?: StorageProviderMutationOptions): Promise<StorageProviderView>;
  deactivateProvider(providerId: string, options?: StorageProviderMutationOptions): Promise<StorageProviderView>;
  rotateCredential(
    providerId: string,
    credentialRef: string,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderView>;
  getCapabilities(
    providerId: string,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderCapabilitiesView>;
  headBucket(
    providerId: string,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderBucketView>;
  getDefaultBinding(
    spaceId?: string,
    options?: StorageProviderMutationOptions,
  ): Promise<StorageProviderBindingView>;
  setDefaultBinding(input: SetDefaultStorageProviderBindingInput): Promise<StorageProviderBindingView>;
  deleteDefaultBinding(
    spaceIdOrSpaceType?: string,
    options?: StorageProviderMutationOptions & { spaceType?: boolean },
  ): Promise<boolean>;
  setSpaceTypeBinding(input: SetDefaultStorageProviderBindingInput & { spaceType: string }): Promise<StorageProviderBindingView>;
  deleteSpaceTypeBinding(spaceType: string, options?: StorageProviderMutationOptions): Promise<boolean>;
  listBindings(
    input?: { providerId?: string; spaceId?: string; lifecycleStatus?: string; signal?: AbortSignal },
  ): Promise<StorageProviderBindingView[]>;
  listBuckets(providerId: string, options?: StorageProviderMutationOptions): Promise<StorageProviderBucketListItemView[]>;
  createBucket(providerId: string, options?: StorageProviderMutationOptions): Promise<StorageProviderBucketView>;
  deleteBucket(providerId: string, options?: StorageProviderMutationOptions): Promise<boolean>;
  listObjects(
    providerId: string,
    input?: ListStorageProviderObjectsInput,
  ): Promise<ListStorageProviderObjectsResult>;
  deleteObject(
    providerId: string,
    objectKey: string,
    options?: StorageProviderMutationOptions,
  ): Promise<boolean>;
}

export interface CreateStorageProviderAdminServiceOptions {
  adminStorageSdkClient: DriveAdminStorageSdkClient;
  getSession: () => SessionSnapshot;
}

interface AdminIdentity {
  tenantId: string;
  operatorId: string;
}

export function createStorageProviderAdminService({
  adminStorageSdkClient,
  getSession,
}: CreateStorageProviderAdminServiceOptions): StorageProviderAdminService {
  const service: StorageProviderAdminService = {
    async listProviders(input = {}) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.list',
        signal: input.signal,
        query: {
          status: input.status,
        },
      });
      return extractItems(response).map(responseToStorageProvider);
    },
    async createProvider(input, options) {
      const identity = resolveAdminIdentity(getSession);
      const body = providerCreateBody(input, identity);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.create',
        signal: options?.signal,
        body,
      });
      return responseToStorageProvider(response);
    },
    async updateProvider(providerId, input, options) {
      const identity = resolveAdminIdentity(getSession);
      const body: JsonRecord = {
      };
      assignDefined(body, 'name', input.name);
      assignDefined(body, 'endpointUrl', input.endpointUrl);
      assignDefined(body, 'region', input.region);
      assignDefined(body, 'bucket', input.bucket);
      assignDefined(body, 'pathStyle', input.pathStyle);
      assignDefined(body, 'credentialRef', input.credentialRef);
      assignDefined(body, 'serverSideEncryptionMode', input.serverSideEncryptionMode);
      assignDefined(body, 'defaultStorageClass', input.defaultStorageClass);
      assignDefined(body, 'status', input.status);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.update',
        signal: options?.signal,
        pathParams: { providerId },
        body,
      });
      return responseToStorageProvider(response);
    },
    async deleteProvider(providerId, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.delete',
        signal: options?.signal,
        pathParams: { providerId },
        query: {
        },
      });
      return booleanField(recordOf(response), 'deleted') ?? false;
    },
    async testProvider(providerId, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.test',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
        },
      });
      return booleanField(recordOf(response), 'reachable') ?? false;
    },
    async activateProvider(providerId, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.activate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
        },
      });
      return responseToStorageProvider(response);
    },
    async deactivateProvider(providerId, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.deactivate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
        },
      });
      return responseToStorageProvider(response);
    },
    async rotateCredential(providerId, credentialRef, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.credentials.rotate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
          credentialRef,
        },
      });
      return responseToStorageProvider(response);
    },
    async getCapabilities(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.capabilities.get',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToCapabilities(response);
    },
    async headBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.head',
        signal: options?.signal,
        pathParams: { providerId },
      });
      const record = recordOf(response);
      return {
        providerId: stringField(record, 'providerId') ?? providerId,
        bucket: stringField(record, 'bucket') ?? '',
        exists: booleanField(record, 'exists') ?? false,
      };
    },
    async getDefaultBinding(spaceId, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.get',
        signal: options?.signal,
        query: {
          spaceId,
        },
      });
      return responseToBinding(response);
    },
    async setDefaultBinding(input) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.set',
        signal: input.signal,
        body: {
          providerId: input.providerId,
          spaceId: input.spaceId,
          spaceType: input.spaceType,
          storageRootPrefix: input.storageRootPrefix,
        },
      });
      return responseToBinding(response);
    },
    async deleteDefaultBinding(spaceIdOrSpaceType, options) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.delete',
        signal: options?.signal,
        query: options?.spaceType
          ? {
              spaceType: spaceIdOrSpaceType,
            }
          : {
              spaceId: spaceIdOrSpaceType,
            },
      });
      return booleanField(recordOf(response), 'deleted') ?? false;
    },
    async setSpaceTypeBinding(input) {
      return service.setDefaultBinding({
        providerId: input.providerId,
        spaceType: input.spaceType,
        storageRootPrefix: input.storageRootPrefix,
        signal: input.signal,
      });
    },
    async deleteSpaceTypeBinding(spaceType, options) {
      return service.deleteDefaultBinding(spaceType, { ...options, spaceType: true });
    },
    async listBindings(input = {}) {
      const identity = resolveAdminIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.list',
        signal: input.signal,
        query: {
          providerId: input.providerId,
          spaceId: input.spaceId,
          lifecycleStatus: input.lifecycleStatus,
        },
      });
      return extractItems(response).map(responseToBinding);
    },
    async listBuckets(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.buckets.list',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return extractItems(response).map((item) => {
        const record = recordOf(item);
        const creationDateEpochMs = numberField(record, 'creationDateEpochMs');
        return {
          name: stringField(record, 'name') ?? '',
          configured: booleanField(record, 'configured') ?? false,
          creationDate: creationDateEpochMs
            ? new Date(creationDateEpochMs).toLocaleDateString()
            : undefined,
        } satisfies StorageProviderBucketListItemView;
      });
    },
    async createBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.create',
        signal: options?.signal,
        pathParams: { providerId },
      });
      const record = recordOf(response);
      return {
        providerId: stringField(record, 'providerId') ?? providerId,
        bucket: stringField(record, 'bucket') ?? '',
        exists: booleanField(record, 'exists') ?? true,
      };
    },
    async deleteBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.delete',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return booleanField(recordOf(response), 'changed') ?? false;
    },
    async listObjects(providerId, input = {}) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.list',
        signal: input.signal,
        pathParams: { providerId },
        query: {
          prefix: input.prefix || undefined,
          delimiter: '/',
          pageSize: input.pageSize ?? 100,
          pageToken: input.pageToken || undefined,
        },
      });
      const record = recordOf(response);
      const prefixes = Array.isArray(record.prefixes)
        ? record.prefixes.filter((item): item is string => typeof item === 'string')
        : [];
      const folders: StorageProviderObjectView[] = prefixes.map((prefix) => ({
        key: prefix,
        sizeBytes: 0,
        isFolder: true,
      }));
      const files = extractItems(record).map((item) => {
        const objectRecord = recordOf(item);
        const objectKey =
          stringField(objectRecord, 'objectKey', 'object_key', 'key') ?? '';
        const contentLength =
          numberField(objectRecord, 'contentLength', 'content_length', 'sizeBytes') ?? 0;
        const lastModifiedEpochMs = numberField(objectRecord, 'lastModifiedEpochMs');
        return {
          key: objectKey,
          sizeBytes: contentLength,
          contentType: stringField(objectRecord, 'contentType', 'content_type'),
          etag: stringField(objectRecord, 'etag'),
          lastModified: lastModifiedEpochMs
            ? new Date(lastModifiedEpochMs).toLocaleString()
            : undefined,
          isFolder: false,
        } satisfies StorageProviderObjectView;
      });
      const nextPageToken = stringField(record, 'nextPageToken');
      return {
        items: [...folders, ...files],
        nextPageToken,
        hasMore: Boolean(nextPageToken),
      };
    },
    async deleteObject(providerId, objectKey, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.delete',
        signal: options?.signal,
        pathParams: { providerId, objectKey: encodeURIComponent(objectKey) },
      });
      return booleanField(recordOf(response), 'deleted') ?? false;
    },
  };

  return service;
}

function resolveAdminIdentity(getSession: () => SessionSnapshot): AdminIdentity {
  const snapshot = getSession();
  const tenantId = snapshot.context?.tenantId;
  const operatorId = snapshot.context?.actorId;
  if (!tenantId || !operatorId) {
    throw new Error('Drive admin session context is missing tenantId or operatorId.');
  }
  return { tenantId, operatorId };
}

function providerCreateBody(
  input: CreateStorageProviderInput,
  identity: AdminIdentity,
): JsonRecord {
  const body: JsonRecord = {
    id: input.id,
    providerKind: input.providerKind,
    name: input.name,
    endpointUrl: input.endpointUrl,
    bucket: input.bucket,
  };
  assignDefined(body, 'region', input.region);
  assignDefined(body, 'pathStyle', input.pathStyle);
  assignDefined(body, 'credentialRef', input.credentialRef);
  assignDefined(body, 'serverSideEncryptionMode', input.serverSideEncryptionMode);
  assignDefined(body, 'defaultStorageClass', input.defaultStorageClass);
  assignDefined(body, 'status', input.status);
  assignDefined(body, 'strictTls', input.strictTls);
  return body;
}

function responseToStorageProvider(response: unknown): StorageProviderView {
  const record = recordOf(response);
  const name = stringField(record, 'name', 'displayName') ?? '';
  return {
    id: stringField(record, 'id', 'providerId') ?? '',
    providerKind: stringField(record, 'providerKind', 'kind') ?? '',
    displayName: name,
    endpointUrl: stringField(record, 'endpointUrl', 'endpoint') ?? '',
    region: stringField(record, 'region'),
    bucket: stringField(record, 'bucket') ?? '',
    pathStyle: booleanField(record, 'pathStyle') ?? false,
    credentialRef: stringField(record, 'credentialRef'),
    credentialConfigured: booleanField(record, 'credentialConfigured') ?? false,
    serverSideEncryptionMode: stringField(record, 'serverSideEncryptionMode'),
    defaultStorageClass: stringField(record, 'defaultStorageClass'),
    status: stringField(record, 'status') ?? 'unknown',
    version: numberField(record, 'version') ?? 0,
    strictTls: booleanField(record, 'strictTls') ?? true,
  };
}

function responseToCapabilities(response: unknown): StorageProviderCapabilitiesView {
  const record = recordOf(response);
  return {
    providerId: stringField(record, 'providerId') ?? '',
    providerKind: stringField(record, 'providerKind') ?? '',
    supportsMultipartUpload: booleanField(record, 'supportsMultipartUpload') ?? false,
    supportsPresignedUploadPart: booleanField(record, 'supportsPresignedUploadPart') ?? false,
    supportsPresignedDownload: booleanField(record, 'supportsPresignedDownload') ?? false,
    supportsServerSideEncryption: booleanField(record, 'supportsServerSideEncryption') ?? false,
    supportsStorageClass: booleanField(record, 'supportsStorageClass') ?? false,
    supportsCredentialRotation: booleanField(record, 'supportsCredentialRotation') ?? false,
    supportedServerSideEncryptionModes: stringArrayField(record, 'supportedServerSideEncryptionModes'),
    supportedStorageClasses: stringArrayField(record, 'supportedStorageClasses'),
  };
}

function responseToBinding(response: unknown): StorageProviderBindingView {
  const record = recordOf(response);
  const storageProvider = record.storageProvider;
  return {
    id: stringField(record, 'id') ?? '',
    tenantId: stringField(record, 'tenantId') ?? '',
    spaceId: stringField(record, 'spaceId'),
    providerId: stringField(record, 'providerId') ?? '',
    bindingScope: stringField(record, 'bindingScope') ?? '',
    purpose: stringField(record, 'purpose') ?? '',
    lifecycleStatus: stringField(record, 'lifecycleStatus') ?? '',
    version: numberField(record, 'version') ?? 0,
    storageRootPrefix: stringField(record, 'storageRootPrefix'),
    storageProvider: isRecord(storageProvider) ? responseToStorageProvider(storageProvider) : undefined,
  };
}

function extractItems(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }
  const record = recordOf(response);
  return Array.isArray(record.items) ? record.items : [];
}

function recordOf(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(source: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function numberField(source: JsonRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function booleanField(source: JsonRecord, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function stringArrayField(source: JsonRecord, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function assignDefined(target: JsonRecord, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
