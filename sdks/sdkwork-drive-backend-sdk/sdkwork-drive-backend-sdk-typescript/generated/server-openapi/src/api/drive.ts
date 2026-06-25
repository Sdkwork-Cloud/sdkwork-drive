import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { AuditEventPage, DownloadPackagePage, ListSpacesResponse, MaintenanceJobPage, QuotaSummary, SweepObjectStoreRequest, SweepResponse, SweepUploadSessionsRequest, UpdateQuotaPolicyRequest } from '../types';


export interface DriveDownloadPackagesListParams {
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
      { name: 'state', value: params?.state, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'pageSize', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DownloadPackagePage>(appendQueryString(backendApiPath(`/drive/download_packages`), query));
  }
}

export interface DriveSpacesAdminListParams {
  ownerSubjectType?: string;
  ownerSubjectId?: string;
}

export class DriveSpacesAdminApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSpacesAdminListParams): Promise<ListSpacesResponse> {
    const query = buildQueryString([
      { name: 'ownerSubjectType', value: params?.ownerSubjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'ownerSubjectId', value: params?.ownerSubjectId, style: 'form', explode: true, allowReserved: false },
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

export class DriveQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async summary(): Promise<QuotaSummary> {
    return this.client.get<QuotaSummary>(backendApiPath(`/drive/quotas`));
  }

/** Update tenant quota policy */
  async update(body: UpdateQuotaPolicyRequest): Promise<QuotaSummary> {
    return this.client.put<QuotaSummary>(backendApiPath(`/drive/quotas`), body, undefined, undefined, 'application/json');
  }
}

export class DriveMaintenanceAbandonedUploadTaskSweepApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async start(body: SweepUploadSessionsRequest): Promise<SweepResponse> {
    return this.client.post<SweepResponse>(backendApiPath(`/drive/maintenance/abandoned_upload_task_sweep`), body, undefined, undefined, 'application/json');
  }
}

export class DriveMaintenanceExpiredUploadContentSweepApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async start(body: SweepUploadSessionsRequest): Promise<SweepResponse> {
    return this.client.post<SweepResponse>(backendApiPath(`/drive/maintenance/expired_upload_content_sweep`), body, undefined, undefined, 'application/json');
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
  jobType?: 'object_sweep' | 'upload_session_sweep' | 'expired_upload_content_sweep' | 'abandoned_upload_task_sweep';
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
  public readonly expiredUploadContentSweep: DriveMaintenanceExpiredUploadContentSweepApi;
  public readonly abandonedUploadTaskSweep: DriveMaintenanceAbandonedUploadTaskSweepApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.jobs = new DriveMaintenanceJobsApi(client);
    this.objectSweep = new DriveMaintenanceObjectSweepApi(client);
    this.uploadSessionSweep = new DriveMaintenanceUploadSessionSweepApi(client);
    this.expiredUploadContentSweep = new DriveMaintenanceExpiredUploadContentSweepApi(client);
    this.abandonedUploadTaskSweep = new DriveMaintenanceAbandonedUploadTaskSweepApi(client);
  }

}

export interface DriveAuditEventsListParams {
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
  public readonly downloadPackages: DriveDownloadPackagesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.auditEvents = new DriveAuditEventsApi(client);
    this.maintenance = new DriveMaintenanceApi(client);
    this.quotas = new DriveQuotasApi(client);
    this.spaces = new DriveSpacesApi(client);
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
