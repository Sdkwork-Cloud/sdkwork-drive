import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AuditEventPage, CopyProviderObjectRequest, CreateStorageProviderRequest, DeleteStorageProviderResponse, DownloadPackagePage, ListSpacesResponse, ListStorageProvidersResponse, MaintenanceJobPage, OperatorRequest, ProviderBucket, ProviderBucketMutation, ProviderObject, ProviderObjectList, ProviderObjectMutation, QuotaSummary, RotateStorageProviderCredentialRequest, SetDefaultStorageProviderBindingRequest, StorageProvider, StorageProviderBinding, StorageProviderCapabilities, SweepObjectStoreRequest, SweepResponse, SweepUploadSessionsRequest, TestStorageProviderRequest, TestStorageProviderResponse, UpdateStorageProviderRequest } from '../types';


export interface DriveDownloadPackagesListParams {
  tenantId?: string;
  state?: 'creating' | 'ready' | 'failed' | 'expired';
  page?: number;
  pageSize?: number;
}

export class DriveDownloadPackagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveDownloadPackagesListParams): Promise<DownloadPackagePage> {
    const query = buildQueryString([
      { name: 'tenantId', value: params?.tenantId, style: 'form', explode: true, allowReserved: false },
      { name: 'state', value: params?.state, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'pageSize', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DownloadPackagePage>(appendQueryString(backendApiPath(`/drive/download_packages`), query));
  }
}

export interface DriveStorageProvidersObjectsListParams {
  prefix?: string;
  delimiter?: string;
  pageToken?: string;
  pageSize?: number;
}

export class DriveStorageProvidersObjectsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(providerId: string, params?: DriveStorageProvidersObjectsListParams): Promise<ProviderObjectList> {
    const query = buildQueryString([
      { name: 'prefix', value: params?.prefix, style: 'form', explode: true, allowReserved: false },
      { name: 'delimiter', value: params?.delimiter, style: 'form', explode: true, allowReserved: false },
      { name: 'pageToken', value: params?.pageToken, style: 'form', explode: true, allowReserved: false },
      { name: 'pageSize', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ProviderObjectList>(appendQueryString(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects`), query));
  }

async head(providerId: string, objectKey: string): Promise<ProviderObject> {
    return this.client.get<ProviderObject>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/${serializePathParameter(objectKey, { name: 'objectKey', style: 'simple', explode: false })}`));
  }

async delete(providerId: string, objectKey: string): Promise<ProviderObjectMutation> {
    return this.client.delete<ProviderObjectMutation>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/${serializePathParameter(objectKey, { name: 'objectKey', style: 'simple', explode: false })}`));
  }

async copy(providerId: string, body: CopyProviderObjectRequest): Promise<ProviderObjectMutation> {
    return this.client.post<ProviderObjectMutation>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/copy`), body, undefined, undefined, 'application/json');
  }
}

export class DriveStorageProvidersBucketApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async head(providerId: string): Promise<ProviderBucket> {
    return this.client.get<ProviderBucket>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }

async create(providerId: string): Promise<ProviderBucketMutation> {
    return this.client.put<ProviderBucketMutation>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }

async delete(providerId: string): Promise<ProviderBucketMutation> {
    return this.client.delete<ProviderBucketMutation>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }
}

export class DriveStorageProvidersCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async rotate(providerId: string, body: RotateStorageProviderCredentialRequest): Promise<StorageProvider> {
    return this.client.post<StorageProvider>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/credentials/rotate`), body, undefined, undefined, 'application/json');
  }
}

export class DriveStorageProvidersCapabilitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async get(providerId: string): Promise<StorageProviderCapabilities> {
    return this.client.get<StorageProviderCapabilities>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/capabilities`));
  }
}

export interface DriveStorageProvidersListParams {
  status?: string;
}

export interface DriveStorageProvidersDeleteParams {
  operatorId: string;
}

export class DriveStorageProvidersApi {
  private client: HttpClient;
  public readonly capabilities: DriveStorageProvidersCapabilitiesApi;
  public readonly credentials: DriveStorageProvidersCredentialsApi;
  public readonly bucket: DriveStorageProvidersBucketApi;
  public readonly objects: DriveStorageProvidersObjectsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.capabilities = new DriveStorageProvidersCapabilitiesApi(client);
    this.credentials = new DriveStorageProvidersCredentialsApi(client);
    this.bucket = new DriveStorageProvidersBucketApi(client);
    this.objects = new DriveStorageProvidersObjectsApi(client);
  }


async list(params?: DriveStorageProvidersListParams): Promise<ListStorageProvidersResponse> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ListStorageProvidersResponse>(appendQueryString(backendApiPath(`/drive/storage_providers`), query));
  }

async create(body: CreateStorageProviderRequest): Promise<StorageProvider> {
    return this.client.post<StorageProvider>(backendApiPath(`/drive/storage_providers`), body, undefined, undefined, 'application/json');
  }

async update(providerId: string, body: UpdateStorageProviderRequest): Promise<StorageProvider> {
    return this.client.patch<StorageProvider>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(providerId: string, params: DriveStorageProvidersDeleteParams): Promise<DeleteStorageProviderResponse> {
    const query = buildQueryString([
      { name: 'operatorId', value: params.operatorId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.delete<DeleteStorageProviderResponse>(appendQueryString(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`), query));
  }

async get(providerId: string): Promise<StorageProvider> {
    return this.client.get<StorageProvider>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`));
  }

async activate(providerId: string, body: OperatorRequest): Promise<StorageProvider> {
    return this.client.post<StorageProvider>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/activate`), body, undefined, undefined, 'application/json');
  }

async deactivate(providerId: string, body: OperatorRequest): Promise<StorageProvider> {
    return this.client.post<StorageProvider>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/deactivate`), body, undefined, undefined, 'application/json');
  }

async test(providerId: string, body: TestStorageProviderRequest): Promise<TestStorageProviderResponse> {
    return this.client.post<TestStorageProviderResponse>(backendApiPath(`/drive/storage_providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/test`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveStorageProviderBindingsDefaultGetParams {
  tenantId: string;
  spaceId?: string;
  spaceType?: 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'git_repository' | 'deployment' | 'app_upload' | 'im' | 'rtc' | 'notary';
}

export class DriveStorageProviderBindingsDefaultApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async get(params: DriveStorageProviderBindingsDefaultGetParams): Promise<StorageProviderBinding> {
    const query = buildQueryString([
      { name: 'tenantId', value: params.tenantId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceId', value: params.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceType', value: params.spaceType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProviderBinding>(appendQueryString(backendApiPath(`/drive/storage_provider_bindings/default`), query));
  }

async set(body: SetDefaultStorageProviderBindingRequest): Promise<StorageProviderBinding> {
    return this.client.put<StorageProviderBinding>(backendApiPath(`/drive/storage_provider_bindings/default`), body, undefined, undefined, 'application/json');
  }
}

export class DriveStorageProviderBindingsApi {
  private client: HttpClient;
  public readonly default: DriveStorageProviderBindingsDefaultApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.default = new DriveStorageProviderBindingsDefaultApi(client);
  }

}

export interface DriveSpacesAdminListParams {
  tenantId: string;
  ownerSubjectType?: string;
  ownerSubjectId?: string;
}

export class DriveSpacesAdminApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params: DriveSpacesAdminListParams): Promise<ListSpacesResponse> {
    const query = buildQueryString([
      { name: 'tenantId', value: params.tenantId, style: 'form', explode: true, allowReserved: false },
      { name: 'ownerSubjectType', value: params.ownerSubjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'ownerSubjectId', value: params.ownerSubjectId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ListSpacesResponse>(appendQueryString(backendApiPath(`/drive/spaces`), query));
  }
}

export class DriveSpacesApi {
  private client: HttpClient;
  public readonly admin: DriveSpacesAdminApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.admin = new DriveSpacesAdminApi(client);
  }

}

export interface DriveQuotasSummaryParams {
  tenantId: string;
}

export class DriveQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async summary(params: DriveQuotasSummaryParams): Promise<QuotaSummary> {
    const query = buildQueryString([
      { name: 'tenantId', value: params.tenantId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<QuotaSummary>(appendQueryString(backendApiPath(`/drive/quotas`), query));
  }
}

export class DriveMaintenanceUploadSessionSweepApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async start(body: SweepUploadSessionsRequest): Promise<SweepResponse> {
    return this.client.post<SweepResponse>(backendApiPath(`/drive/maintenance/upload_session_sweep`), body, undefined, undefined, 'application/json');
  }
}

export class DriveMaintenanceObjectSweepApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async start(body: SweepObjectStoreRequest): Promise<SweepResponse> {
    return this.client.post<SweepResponse>(backendApiPath(`/drive/maintenance/object_sweep`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveMaintenanceJobsListParams {
  jobType?: 'object_sweep' | 'upload_session_sweep';
  status?: 'completed' | 'failed';
  operatorId?: string;
  page?: number;
  pageSize?: number;
}

export class DriveMaintenanceJobsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveMaintenanceJobsListParams): Promise<MaintenanceJobPage> {
    const query = buildQueryString([
      { name: 'jobType', value: params?.jobType, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'operatorId', value: params?.operatorId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'pageSize', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<MaintenanceJobPage>(appendQueryString(backendApiPath(`/drive/maintenance/jobs`), query));
  }
}

export class DriveMaintenanceApi {
  private client: HttpClient;
  public readonly jobs: DriveMaintenanceJobsApi;
  public readonly objectSweep: DriveMaintenanceObjectSweepApi;
  public readonly uploadSessionSweep: DriveMaintenanceUploadSessionSweepApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.jobs = new DriveMaintenanceJobsApi(client);
    this.objectSweep = new DriveMaintenanceObjectSweepApi(client);
    this.uploadSessionSweep = new DriveMaintenanceUploadSessionSweepApi(client);
  }

}

export interface DriveAuditEventsListParams {
  tenantId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  requestId?: string;
  traceId?: string;
  page?: number;
  pageSize?: number;
}

export class DriveAuditEventsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveAuditEventsListParams): Promise<AuditEventPage> {
    const query = buildQueryString([
      { name: 'tenantId', value: params?.tenantId, style: 'form', explode: true, allowReserved: false },
      { name: 'action', value: params?.action, style: 'form', explode: true, allowReserved: false },
      { name: 'resourceType', value: params?.resourceType, style: 'form', explode: true, allowReserved: false },
      { name: 'resourceId', value: params?.resourceId, style: 'form', explode: true, allowReserved: false },
      { name: 'requestId', value: params?.requestId, style: 'form', explode: true, allowReserved: false },
      { name: 'traceId', value: params?.traceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'pageSize', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<AuditEventPage>(appendQueryString(backendApiPath(`/drive/audit_events`), query));
  }
}

export class DriveApi {
  private client: HttpClient;
  public readonly auditEvents: DriveAuditEventsApi;
  public readonly maintenance: DriveMaintenanceApi;
  public readonly quotas: DriveQuotasApi;
  public readonly spaces: DriveSpacesApi;
  public readonly storageProviderBindings: DriveStorageProviderBindingsApi;
  public readonly storageProviders: DriveStorageProvidersApi;
  public readonly downloadPackages: DriveDownloadPackagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.auditEvents = new DriveAuditEventsApi(client);
    this.maintenance = new DriveMaintenanceApi(client);
    this.quotas = new DriveQuotasApi(client);
    this.spaces = new DriveSpacesApi(client);
    this.storageProviderBindings = new DriveStorageProviderBindingsApi(client);
    this.storageProviders = new DriveStorageProvidersApi(client);
    this.downloadPackages = new DriveDownloadPackagesApi(client);
  }

}

export function createDriveApi(client: HttpClient): DriveApi {
  return new DriveApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
