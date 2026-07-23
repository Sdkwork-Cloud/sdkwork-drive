import { customApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CopyProviderObjectRequest, CreateStorageProviderRequest, RotateStorageProviderCredentialRequest, SetDefaultStorageProviderBindingRequest, StorageProviderBindingsDefaultRetrieveResponse, StorageProviderBindingsDefaultUpdateResponse, StorageProviderBindingsListResponse, StorageProvidersActivateResponse, StorageProvidersBucketRetrieveResponse, StorageProvidersBucketsListResponse, StorageProvidersBucketUpdateResponse, StorageProvidersCapabilitiesListResponse, StorageProvidersCreateResponse201, StorageProvidersCredentialsRotateResponse, StorageProvidersDeactivateResponse, StorageProvidersListResponse, StorageProvidersObjectsCopyResponse, StorageProvidersObjectsListResponse, StorageProvidersObjectsRetrieveResponse, StorageProvidersRetrieveResponse, StorageProvidersTestResponse, StorageProvidersUpdateResponse, UpdateStorageProviderRequest } from '../types';


export interface DriveStorageProvidersObjectsListParams {
  prefix?: string;
  delimiter?: string;
  cursor?: string;
  pageSize?: number;
}

export class DriveStorageProvidersObjectsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(providerId: string, params?: DriveStorageProvidersObjectsListParams): Promise<StorageProvidersObjectsListResponse> {
    const query = buildQueryString([
      { name: 'prefix', value: params?.prefix, style: 'form', explode: true, allowReserved: false },
      { name: 'delimiter', value: params?.delimiter, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProvidersObjectsListResponse>(appendQueryString(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects`), query));
  }

async retrieve(providerId: string, objectKey: string): Promise<StorageProvidersObjectsRetrieveResponse> {
    return this.client.get<StorageProvidersObjectsRetrieveResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/${serializePathParameter(objectKey, { name: 'objectKey', style: 'simple', explode: false })}`));
  }

async delete(providerId: string, objectKey: string): Promise<void> {
    return this.client.delete<void>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/${serializePathParameter(objectKey, { name: 'objectKey', style: 'simple', explode: false })}`));
  }

async copy(providerId: string, body: CopyProviderObjectRequest): Promise<StorageProvidersObjectsCopyResponse> {
    return this.client.post<StorageProvidersObjectsCopyResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/objects/copy`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveStorageProvidersBucketListParams {
  cursor?: string;
  pageSize?: number;
}

export class DriveStorageProvidersBucketApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(providerId: string): Promise<StorageProvidersBucketRetrieveResponse> {
    return this.client.get<StorageProvidersBucketRetrieveResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }

async update(providerId: string): Promise<StorageProvidersBucketUpdateResponse> {
    return this.client.put<StorageProvidersBucketUpdateResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }

async delete(providerId: string): Promise<void> {
    return this.client.delete<void>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/bucket`));
  }

/** List buckets visible to a Drive storage provider account */
  async list(providerId: string, params?: DriveStorageProvidersBucketListParams): Promise<StorageProvidersBucketsListResponse> {
    const query = buildQueryString([
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProvidersBucketsListResponse>(appendQueryString(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/buckets`), query));
  }
}

export class DriveStorageProvidersCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async rotate(providerId: string, body: RotateStorageProviderCredentialRequest): Promise<StorageProvidersCredentialsRotateResponse> {
    return this.client.post<StorageProvidersCredentialsRotateResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/credentials/rotate`), body, undefined, undefined, 'application/json');
  }
}

export class DriveStorageProvidersCapabilitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(providerId: string): Promise<StorageProvidersCapabilitiesListResponse> {
    return this.client.get<StorageProvidersCapabilitiesListResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/capabilities`));
  }
}

export interface DriveStorageProvidersListParams {
  status?: string;
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


async list(params?: DriveStorageProvidersListParams): Promise<StorageProvidersListResponse> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProvidersListResponse>(appendQueryString(customApiPath(`/drive/storage/providers`), query));
  }

async create(body: CreateStorageProviderRequest): Promise<StorageProvidersCreateResponse201> {
    return this.client.post<StorageProvidersCreateResponse201>(customApiPath(`/drive/storage/providers`), body, undefined, undefined, 'application/json');
  }

async update(providerId: string, body: UpdateStorageProviderRequest): Promise<StorageProvidersUpdateResponse> {
    return this.client.patch<StorageProvidersUpdateResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(providerId: string): Promise<void> {
    return this.client.delete<void>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`));
  }

async retrieve(providerId: string): Promise<StorageProvidersRetrieveResponse> {
    return this.client.get<StorageProvidersRetrieveResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}`));
  }

async activate(providerId: string): Promise<StorageProvidersActivateResponse> {
    return this.client.post<StorageProvidersActivateResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/activate`));
  }

async deactivate(providerId: string): Promise<StorageProvidersDeactivateResponse> {
    return this.client.post<StorageProvidersDeactivateResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/deactivate`));
  }

async test(providerId: string): Promise<StorageProvidersTestResponse> {
    return this.client.post<StorageProvidersTestResponse>(customApiPath(`/drive/storage/providers/${serializePathParameter(providerId, { name: 'providerId', style: 'simple', explode: false })}/test`));
  }
}

export interface DriveStorageProviderBindingsDefaultRetrieveParams {
  spaceId?: string;
  spaceType?: 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'git_repository' | 'deployment' | 'app_upload' | 'im' | 'rtc' | 'notary' | 'website';
}

export interface DriveStorageProviderBindingsDefaultDeleteParams {
  spaceId?: string;
  spaceType?: 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'git_repository' | 'deployment' | 'app_upload' | 'im' | 'rtc' | 'notary' | 'website';
}

export class DriveStorageProviderBindingsDefaultApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(params?: DriveStorageProviderBindingsDefaultRetrieveParams): Promise<StorageProviderBindingsDefaultRetrieveResponse> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceType', value: params?.spaceType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProviderBindingsDefaultRetrieveResponse>(appendQueryString(customApiPath(`/drive/storage/bindings/default`), query));
  }

async update(body: SetDefaultStorageProviderBindingRequest): Promise<StorageProviderBindingsDefaultUpdateResponse> {
    return this.client.put<StorageProviderBindingsDefaultUpdateResponse>(customApiPath(`/drive/storage/bindings/default`), body, undefined, undefined, 'application/json');
  }

/** Delete a Drive default storage provider binding */
  async delete(params?: DriveStorageProviderBindingsDefaultDeleteParams): Promise<void> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceType', value: params?.spaceType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.delete<void>(appendQueryString(customApiPath(`/drive/storage/bindings/default`), query));
  }
}

export interface DriveStorageProviderBindingsListParams {
  spaceId?: string;
  providerId?: string;
  lifecycleStatus?: 'active' | 'disabled' | 'deleted';
}

export class DriveStorageProviderBindingsApi {
  private client: HttpClient;
  public readonly default: DriveStorageProviderBindingsDefaultApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.default = new DriveStorageProviderBindingsDefaultApi(client);
  }


/** List Drive storage provider bindings */
  async list(params?: DriveStorageProviderBindingsListParams): Promise<StorageProviderBindingsListResponse> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'providerId', value: params?.providerId, style: 'form', explode: true, allowReserved: false },
      { name: 'lifecycleStatus', value: params?.lifecycleStatus, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StorageProviderBindingsListResponse>(appendQueryString(customApiPath(`/drive/storage/bindings`), query));
  }
}

export class DriveApi {

  public readonly storageProviderBindings: DriveStorageProviderBindingsApi;
  public readonly storageProviders: DriveStorageProvidersApi;

  constructor(client: HttpClient) {

    this.storageProviderBindings = new DriveStorageProviderBindingsApi(client);
    this.storageProviders = new DriveStorageProvidersApi(client);
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
